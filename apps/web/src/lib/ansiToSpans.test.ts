import { describe, expect, it } from "vitest";
import { ansiToSpans, stripAnsiCodes } from "./ansiToSpans.js";

const ESC = "\x1b";

describe("ansiToSpans", () => {
  it("returns plain text untouched as a single span", () => {
    expect(ansiToSpans("Done (1.234s)! For help, type \"help\"")).toEqual([
      { text: 'Done (1.234s)! For help, type "help"' },
    ]);
  });

  it("applies a foreground color from an SGR code and resets after code 0", () => {
    const line = `${ESC}[33mWarning: low TPS${ESC}[0m back to normal`;
    expect(ansiToSpans(line)).toEqual([
      { text: "Warning: low TPS", className: "text-yellow-400" },
      { text: " back to normal" },
    ]);
  });

  it("combines bold with a color into one className", () => {
    const line = `${ESC}[1;31mFATAL${ESC}[0m`;
    expect(ansiToSpans(line)).toEqual([{ text: "FATAL", className: "text-red-400 font-bold" }]);
  });

  it("a bare reset code (ESC[m, no digits) clears active styling", () => {
    const line = `${ESC}[32mgreen${ESC}[mplain`;
    expect(ansiToSpans(line)).toEqual([
      { text: "green", className: "text-green-400" },
      { text: "plain" },
    ]);
  });

  it("silently consumes non-SGR CSI sequences (e.g. JLine's bracketed-paste/cursor-mode toggles) instead of leaking them as text", () => {
    const line = `>....${ESC}[?1h=${ESC}[?2004h>....`;
    const spans = ansiToSpans(line);
    expect(spans.map((s) => s.text).join("")).toBe(">....=>....");
  });

  it("ignores unsupported SGR codes (e.g. 256-color) rather than failing to render the line", () => {
    const line = `${ESC}[38;5;208morange-ish${ESC}[0m`;
    expect(ansiToSpans(line)).toEqual([{ text: "orange-ish" }]);
  });
});

describe("stripAnsiCodes", () => {
  it("removes escape codes for plain-text search matching", () => {
    expect(stripAnsiCodes(`${ESC}[33mThere are 0 of a max of 20 players online: ${ESC}[0m`)).toBe(
      "There are 0 of a max of 20 players online: ",
    );
  });
});
