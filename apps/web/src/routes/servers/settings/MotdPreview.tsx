const COLOR_HEX: Record<string, string> = {
  "0": "#000000",
  "1": "#0000AA",
  "2": "#00AA00",
  "3": "#00AAAA",
  "4": "#AA0000",
  "5": "#AA00AA",
  "6": "#FFAA00",
  "7": "#AAAAAA",
  "8": "#555555",
  "9": "#5555FF",
  a: "#55FF55",
  b: "#55FFFF",
  c: "#FF5555",
  d: "#FF55FF",
  e: "#FFFF55",
  f: "#FFFFFF",
};

interface MotdSegment {
  text: string;
  color: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  obfuscated: boolean;
}

const DEFAULT_STYLE = { color: "#FFFFFF", bold: false, italic: false, underline: false, strikethrough: false, obfuscated: false };

/** Parses real Minecraft §-formatted MOTD text (server.properties' literal `\n` marks a second line) into styled segments per line. */
export function parseMotd(motd: string): MotdSegment[][] {
  return motd.split("\\n").map((line) => {
    const segments: MotdSegment[] = [];
    let current = { ...DEFAULT_STYLE };
    let buffer = "";

    const flush = () => {
      if (buffer) segments.push({ ...current, text: buffer });
      buffer = "";
    };

    for (let i = 0; i < line.length; i++) {
      if (line[i] === "§" && i + 1 < line.length) {
        const code = line[i + 1]!.toLowerCase();
        flush();
        if (code in COLOR_HEX) current = { ...DEFAULT_STYLE, color: COLOR_HEX[code]! };
        else if (code === "l") current = { ...current, bold: true };
        else if (code === "o") current = { ...current, italic: true };
        else if (code === "n") current = { ...current, underline: true };
        else if (code === "m") current = { ...current, strikethrough: true };
        else if (code === "k") current = { ...current, obfuscated: true };
        else if (code === "r") current = { ...DEFAULT_STYLE };
        i++;
        continue;
      }
      buffer += line[i];
    }
    flush();
    return segments;
  });
}

/** Renders just the styled MOTD lines (no background/border) — MotdPreview below wraps this for standalone use under the MOTD input. */
function MotdLines({ motd, className }: { motd: string; className?: string }) {
  const lines = parseMotd(motd);

  return (
    <div className={className}>
      {lines.map((segments, i) => (
        <div key={i} className="whitespace-pre" style={{ textShadow: "1px 1px 0 rgba(0,0,0,0.6)" }}>
          {segments.length === 0
            ? " "
            : segments.map((seg, j) => (
                <span
                  key={j}
                  style={{
                    color: seg.color,
                    fontWeight: seg.bold ? 700 : 400,
                    fontStyle: seg.italic ? "italic" : "normal",
                    textDecoration: [seg.underline && "underline", seg.strikethrough && "line-through"].filter(Boolean).join(" ") || undefined,
                  }}
                  className={seg.obfuscated ? "tracking-wide opacity-80" : undefined}
                  title={seg.obfuscated ? "Obfuscated: cycles random characters in-game" : undefined}
                >
                  {seg.text}
                </span>
              ))}
        </div>
      ))}
    </div>
  );
}

/** Renders a MOTD the way it would actually look in Minecraft's multiplayer server list. */
export function MotdPreview({ motd }: { motd: string }) {
  return <MotdLines motd={motd} className="rounded-md border border-border bg-[#2b2b2b] px-3 py-2 text-sm leading-relaxed" />;
}
