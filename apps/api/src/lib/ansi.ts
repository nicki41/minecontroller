// The itzg image runs with Tty:true (see DockerMinecraftRuntime), which can
// make the JVM/logger emit ANSI color codes it would otherwise suppress.
// Strip them so the console UI shows plain text. Covers CSI/SGR sequences
// (e.g. ESC + "[32m", ESC + "[0m") — the only kind of escape a Minecraft
// server's log output realistically uses.
//
// Built with String.fromCharCode + RegExp() rather than a /ESC.../ literal
// so the actual escape byte is unambiguous in source rather than relying on
// an escape sequence embedded in a regex literal.
const ESCAPE_BYTE = String.fromCharCode(27);
// Requires the real ESC byte up front, so ordinary bracketed log text like
// "[Server thread/INFO]" is never touched — only real ESC-prefixed CSI
// sequences are stripped.
const ANSI_CSI_PATTERN = new RegExp(`${ESCAPE_BYTE}\\[[0-9;]*[a-zA-Z]`, "g");

export function stripAnsi(input: string): string {
  return input.replace(ANSI_CSI_PATTERN, "");
}
