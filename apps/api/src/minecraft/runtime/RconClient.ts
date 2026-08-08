import net from "node:net";

// Source RCON protocol (used unmodified by Minecraft's built-in RCON
// server). Deliberately implemented from the spec here instead of adding a
// third-party dependency — the protocol is small, stable, and this carries
// a password, so keeping it in-house and reviewable felt safer than trusting
// a low-traffic package.
const PACKET_TYPE = {
  AUTH: 3,
  AUTH_RESPONSE: 2,
  EXEC_COMMAND: 2,
  RESPONSE_VALUE: 0,
} as const;

interface RconPacket {
  id: number;
  type: number;
  body: string;
}

export class RconAuthError extends Error {
  constructor() {
    super("RCON authentication failed (wrong password).");
    this.name = "RconAuthError";
  }
}

interface Waiter {
  resolve: (packet: RconPacket) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class RconClient {
  private socket: net.Socket | null = null;
  private buffer = Buffer.alloc(0);
  private nextId = 1;
  private pending = new Map<number, Waiter>();
  private authWaiter: Waiter | null = null;
  private connectPromise: Promise<void> | null = null;

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly password: string,
    private readonly timeoutMs = 5000,
  ) {}

  async connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.doConnect().catch((err) => {
      this.connectPromise = null;
      throw err;
    });
    return this.connectPromise;
  }

  async send(command: string): Promise<string> {
    await this.connect();
    const id = this.writeRaw(PACKET_TYPE.EXEC_COMMAND, command);
    const response = await this.awaitPacket(id);
    return response.body;
  }

  disconnect(): void {
    this.socket?.destroy();
    this.socket = null;
    this.connectPromise = null;
    const err = new Error("RCON connection closed");
    for (const waiter of this.pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(err);
    }
    this.pending.clear();
    if (this.authWaiter) {
      clearTimeout(this.authWaiter.timer);
      this.authWaiter.reject(err);
      this.authWaiter = null;
    }
  }

  private async doConnect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      const timer = setTimeout(() => {
        cleanup();
        socket.destroy();
        reject(new Error(`RCON connection to ${this.host}:${this.port} timed out`));
      }, this.timeoutMs);

      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        clearTimeout(timer);
        socket.off("error", onError);
        socket.off("connect", onConnect);
      };

      socket.once("error", onError);
      socket.once("connect", onConnect);

      this.socket = socket;
      socket.on("data", (chunk: Buffer) => this.onData(chunk));
      socket.on("error", () => this.disconnect());
      socket.on("close", () => this.disconnect());
    });

    const authId = this.writeRaw(PACKET_TYPE.AUTH, this.password);
    const response = await new Promise<RconPacket>((resolve, reject) => {
      this.authWaiter = { resolve, reject, timer: setTimeout(() => reject(new Error("RCON auth timed out")), this.timeoutMs) };
    });
    if (response.id === -1 || response.id !== authId) {
      this.disconnect();
      throw new RconAuthError();
    }
  }

  private writeRaw(type: number, body: string): number {
    if (!this.socket) throw new Error("RCON socket not connected");
    const id = this.nextId++;
    const bodyBuf = Buffer.from(body, "utf8");
    const length = 4 + 4 + bodyBuf.length + 2; // id + type + body + 2 null terminators
    const packet = Buffer.alloc(4 + length);
    packet.writeInt32LE(length, 0);
    packet.writeInt32LE(id, 4);
    packet.writeInt32LE(type, 8);
    bodyBuf.copy(packet, 12);
    packet.writeUInt8(0, 12 + bodyBuf.length);
    packet.writeUInt8(0, 12 + bodyBuf.length + 1);
    this.socket.write(packet);
    return id;
  }

  private awaitPacket(id: number): Promise<RconPacket> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("RCON response timed out"));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
    });
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    for (;;) {
      if (this.buffer.length < 4) return;
      const length = this.buffer.readInt32LE(0);
      if (this.buffer.length < 4 + length) return; // wait for the rest of this packet

      const id = this.buffer.readInt32LE(4);
      const type = this.buffer.readInt32LE(8);
      const bodyEnd = 4 + length - 2; // strip the two trailing null bytes
      const body = this.buffer.toString("utf8", 12, bodyEnd);
      this.buffer = this.buffer.subarray(4 + length);

      const packet: RconPacket = { id, type, body };

      if (type === PACKET_TYPE.AUTH_RESPONSE && this.authWaiter) {
        const waiter = this.authWaiter;
        this.authWaiter = null;
        clearTimeout(waiter.timer);
        waiter.resolve(packet);
        continue;
      }

      const waiter = this.pending.get(id);
      if (waiter) {
        this.pending.delete(id);
        clearTimeout(waiter.timer);
        waiter.resolve(packet);
      }
    }
  }
}
