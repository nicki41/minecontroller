import type Docker from "dockerode";
import { stripAnsi } from "../../lib/ansi.js";
import { logger } from "../../lib/logger.js";

export interface ConsoleLine {
  timestamp: number;
  text: string;
}

const MAX_BUFFERED_LINES = 1000;
const DEFAULT_COMMAND_TIMEOUT_MS = 8000;
const QUIET_WINDOW_MS = 400;
const MAX_CAPTURED_LINES = 50;
const MAX_QUEUE_DEPTH = 20;

// The only command whose response text any real caller actually parses (see
// PlayerActivityTracker.parseOnlineNames / MetricsHistoryCollector /
// PlayerService.getOnlinePlayerNames, all of which poll "list"). Every other
// command the panel sends (op/whitelist/ban/kick/gamemode/tell/pardon/
// save-all, and free-form input typed into the Console tab) is fire-and-
// forget from every real caller today — nothing reads its return value — so
// it only needs the generic quiet-window capture below, not its own regex.
const LIST_COMMAND = /^list\b/i;
const LIST_RESPONSE = /^There are \d+ of a max of \d+ players online/i;

interface PendingCommand {
  command: string;
  responseMatcher: RegExp | null;
  captured: string[];
  quietTimer: ReturnType<typeof setTimeout> | null;
  timeoutTimer: ReturnType<typeof setTimeout>;
  resolve: (text: string) => void;
  reject: (err: Error) => void;
}

/**
 * One instance per PANEL_MANAGED server-with-a-container, owned by
 * MinecraftServerManager (mirrors how ServerLiveSession is one-per-server-
 * with-clients). Replaces RCON: a single shared Docker attach connection
 * (stdin+stdout+stderr) is used for both the live console feed and for
 * sending commands, so a command's response is observed on the exact same
 * stream as everything else — no separate connection to race against.
 *
 * Commands are serialized (one in flight at a time) because a raw
 * stdin/stdout stream has no per-command transaction id the way RCON's
 * packet framing did — there is no other way to know which output belongs
 * to which command.
 */
export class AttachConsoleSession {
  private stream: NodeJS.ReadWriteStream | null = null;
  private readonly buffer: ConsoleLine[] = [];
  private readonly lineListeners = new Set<(line: ConsoleLine) => void>();
  private readonly closeListeners = new Set<() => void>();
  private readonly queue: PendingCommand[] = [];
  private chunkRemainder = "";
  private opening: Promise<void> | null = null;

  constructor(private readonly container: Docker.Container) {}

  get isOpen(): boolean {
    return this.stream !== null;
  }

  async open(): Promise<void> {
    if (this.stream) return;
    if (this.opening) return this.opening;
    this.opening = this.doOpen().finally(() => {
      this.opening = null;
    });
    return this.opening;
  }

  close(): void {
    const err = new Error("Console session closed.");
    this.stream?.removeAllListeners?.();
    (this.stream as unknown as { destroy?: () => void } | null)?.destroy?.();
    this.stream = null;
    this.failQueue(err);
  }

  onLine(listener: (line: ConsoleLine) => void): () => void {
    this.lineListeners.add(listener);
    return () => this.lineListeners.delete(listener);
  }

  /** Fires once, when the underlying attach stream ends or errors (container stopped/crashed/removed). */
  onClose(listener: () => void): () => void {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  getBacklog(): ConsoleLine[] {
    return [...this.buffer];
  }

  async sendCommand(command: string, opts: { timeoutMs?: number } = {}): Promise<string> {
    if (!this.stream) throw new Error("Console is not open.");
    const clean = singleLine(command);
    if (!clean) throw new Error("Command cannot be empty.");
    if (this.queue.length >= MAX_QUEUE_DEPTH) {
      throw new Error("Console command queue is full; the server may be unresponsive.");
    }

    return new Promise<string>((resolve, reject) => {
      const pending: PendingCommand = {
        command: clean,
        responseMatcher: LIST_COMMAND.test(clean) ? LIST_RESPONSE : null,
        captured: [],
        quietTimer: null,
        resolve,
        reject,
        timeoutTimer: setTimeout(
          () => this.settleFront("timeout", new Error(`Command timed out: ${clean}`)),
          opts.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS,
        ),
      };
      this.queue.push(pending);
      if (this.queue.length === 1) this.writeToStream(clean);
    });
  }

  private async doOpen(): Promise<void> {
    // One-shot backlog snapshot, deliberately independent of the live attach
    // connection's own `logs: true` replay option (whose exact backlog
    // window is Docker-version-dependent and underdocumented) — this way
    // backlog behavior is fully within our control.
    try {
      const raw = (await this.container.logs({
        follow: false,
        stdout: true,
        stderr: true,
        tail: 200,
        timestamps: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)) as unknown as Buffer;
      for (const text of splitLines(raw.toString("utf8"))) {
        this.appendLine(text);
      }
    } catch (err) {
      logger.warn({ err }, "Failed to seed console backlog");
    }

    const stream = (await this.container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      hijack: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)) as unknown as NodeJS.ReadWriteStream;
    this.stream = stream;
    stream.on("data", (chunk: Buffer) => this.handleChunk(chunk));
    stream.on("error", (err: Error) => {
      logger.debug({ err }, "Console attach stream error");
      this.handleStreamEnded();
    });
    stream.on("close", () => this.handleStreamEnded());
    stream.on("end", () => this.handleStreamEnded());
  }

  private handleStreamEnded(): void {
    if (!this.stream) return; // already closed via close()
    this.stream = null;
    this.failQueue(new Error("Console attach stream ended."));
    for (const listener of this.closeListeners) listener();
  }

  private writeToStream(command: string): void {
    this.stream?.write(`${command}\n`);
  }

  private handleChunk(chunk: Buffer): void {
    // Broadcast/buffer the RAW text (ANSI intact) — stripping only ever
    // happens per-consumer (e.g. for regex matching below, or in
    // ServerLiveSession before it reaches the browser) so colored console
    // output isn't lost at the source.
    this.chunkRemainder += chunk.toString("utf8");
    const lines = this.chunkRemainder.split(/\r?\n/);
    this.chunkRemainder = lines.pop() ?? "";
    for (const line of lines) {
      if (line.length === 0) continue;
      this.appendLine(line);
    }
  }

  private appendLine(text: string): void {
    const line: ConsoleLine = { timestamp: Date.now(), text };
    this.buffer.push(line);
    if (this.buffer.length > MAX_BUFFERED_LINES) this.buffer.shift();
    for (const listener of this.lineListeners) listener(line);
    this.matchAgainstPendingCommand(text);
  }

  /**
   * Every line is broadcast above unconditionally, whether or not it's also
   * captured as a command's response — matching only ever copies, never
   * hides a line from the live feed.
   */
  private matchAgainstPendingCommand(rawText: string): void {
    const pending = this.queue[0];
    if (!pending) return;
    const stripped = stripAnsi(rawText);

    if (pending.responseMatcher) {
      if (pending.responseMatcher.test(stripped)) this.settleFront("resolve", stripped);
      return;
    }

    pending.captured.push(stripped);
    if (pending.quietTimer) clearTimeout(pending.quietTimer);
    if (pending.captured.length >= MAX_CAPTURED_LINES) {
      this.settleFront("resolve", pending.captured.join("\n"));
      return;
    }
    pending.quietTimer = setTimeout(() => this.settleFront("resolve", pending.captured.join("\n")), QUIET_WINDOW_MS);
  }

  private settleFront(kind: "resolve" | "timeout", value: string | Error): void {
    const pending = this.queue.shift();
    if (!pending) return;
    clearTimeout(pending.timeoutTimer);
    if (pending.quietTimer) clearTimeout(pending.quietTimer);
    if (kind === "resolve") pending.resolve(value as string);
    else pending.reject(value as Error);

    const next = this.queue[0];
    if (next) this.writeToStream(next.command);
  }

  private failQueue(err: Error): void {
    const pending = this.queue.splice(0, this.queue.length);
    for (const p of pending) {
      clearTimeout(p.timeoutTimer);
      if (p.quietTimer) clearTimeout(p.quietTimer);
      p.reject(err);
    }
  }
}

function splitLines(text: string): string[] {
  return text.split(/\r?\n/).filter((l) => l.length > 0);
}

/** Raw stdin is line-oriented, so an embedded newline would inject a second, independent command — collapse to a single line like sanitizeMessage()/sanitizeReason() do for player-facing text elsewhere. */
function singleLine(command: string): string {
  return command.replace(/[\r\n]+/g, " ").trim();
}
