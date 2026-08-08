import { describe, expect, it } from "vitest";
import { stripAnsi } from "./ansi.js";

const ESC = String.fromCharCode(27);

describe("stripAnsi", () => {
  it("removes ANSI color/reset codes", () => {
    const input = `${ESC}[32m[12:00:00] [Server thread/INFO]: Done (1.5s)!${ESC}[0m`;
    expect(stripAnsi(input)).toBe("[12:00:00] [Server thread/INFO]: Done (1.5s)!");
  });

  it("never touches ordinary bracketed log text with no escape byte present", () => {
    // Regression test: an earlier version of the pattern matched a literal
    // "[" followed by a letter even without a preceding ESC byte, which
    // corrupted every normal Minecraft log line (they all start with
    // "[HH:MM:SS] [Thread/LEVEL]: ...").
    const line = "[12:00:00] [Server thread/INFO]: Done (1.5s)! For help, type \"help\"";
    expect(stripAnsi(line)).toBe(line);
  });

  it("leaves plain text with no escape sequences untouched", () => {
    expect(stripAnsi("hello world")).toBe("hello world");
  });
});
