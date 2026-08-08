/**
 * Minimal, order- and comment-preserving codec for Java .properties files —
 * specifically Minecraft's server.properties, which never uses the more
 * exotic parts of the Java Properties spec (multi-line continuations,
 * unicode escapes in keys) in practice. Good enough to read/write the
 * handful of keys our schema knows about without disturbing anything else
 * in the file, matching the same "touch only what's known" contract as
 * lib/yaml-backed serverConfig.service.ts.
 */

type PropertiesLine =
  | { type: "comment" | "blank"; raw: string }
  | { type: "entry"; key: string; value: string };

export class PropertiesDocument {
  private constructor(private lines: PropertiesLine[]) {}

  static parse(raw: string): PropertiesDocument {
    const lines: PropertiesLine[] = raw.split(/\r?\n/).map((rawLine) => {
      const trimmed = rawLine.trim();
      if (trimmed === "") return { type: "blank", raw: rawLine };
      if (trimmed.startsWith("#") || trimmed.startsWith("!")) return { type: "comment", raw: rawLine };
      const eq = rawLine.indexOf("=");
      if (eq === -1) return { type: "comment", raw: rawLine }; // malformed line — preserve verbatim rather than lose it
      return { type: "entry", key: rawLine.slice(0, eq).trim(), value: rawLine.slice(eq + 1) };
    });
    return new PropertiesDocument(lines);
  }

  static empty(): PropertiesDocument {
    return new PropertiesDocument([]);
  }

  get(key: string): string | undefined {
    const line = this.lines.find((l) => l.type === "entry" && l.key === key) as Extract<PropertiesLine, { type: "entry" }> | undefined;
    return line?.value;
  }

  set(key: string, value: string): void {
    const existing = this.lines.find((l) => l.type === "entry" && l.key === key) as
      | Extract<PropertiesLine, { type: "entry" }>
      | undefined;
    if (existing) {
      existing.value = value;
    } else {
      // Drop a single trailing blank line so appended keys land right after
      // existing content instead of after a stray gap, then re-add it.
      if (this.lines.length > 0 && this.lines[this.lines.length - 1]!.type === "blank") {
        this.lines.splice(this.lines.length - 1, 0, { type: "entry", key, value });
      } else {
        this.lines.push({ type: "entry", key, value });
      }
    }
  }

  toString(): string {
    return this.lines
      .map((l) => (l.type === "entry" ? `${l.key}=${l.value}` : l.raw))
      .join("\n");
  }
}
