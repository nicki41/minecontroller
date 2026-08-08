import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COLOR_CODES: { code: string; label: string; hex: string }[] = [
  { code: "0", label: "Black", hex: "#000000" },
  { code: "1", label: "Dark Blue", hex: "#0000AA" },
  { code: "2", label: "Dark Green", hex: "#00AA00" },
  { code: "3", label: "Dark Aqua", hex: "#00AAAA" },
  { code: "4", label: "Dark Red", hex: "#AA0000" },
  { code: "5", label: "Dark Purple", hex: "#AA00AA" },
  { code: "6", label: "Gold", hex: "#FFAA00" },
  { code: "7", label: "Gray", hex: "#AAAAAA" },
  { code: "8", label: "Dark Gray", hex: "#555555" },
  { code: "9", label: "Blue", hex: "#5555FF" },
  { code: "a", label: "Green", hex: "#55FF55" },
  { code: "b", label: "Aqua", hex: "#55FFFF" },
  { code: "c", label: "Red", hex: "#FF5555" },
  { code: "d", label: "Light Purple", hex: "#FF55FF" },
  { code: "e", label: "Yellow", hex: "#FFFF55" },
  { code: "f", label: "White", hex: "#FFFFFF" },
];

const FORMAT_CODES: { code: string; label: string }[] = [
  { code: "l", label: "Bold" },
  { code: "o", label: "Italic" },
  { code: "n", label: "Underline" },
  { code: "m", label: "Strikethrough" },
  { code: "k", label: "Obfuscated" },
  { code: "r", label: "Reset" },
];

/** Inline formatting reference for the MOTD field — clicking a swatch/format inserts its § code at the caret. */
export function MotdHelp({ onInsert }: { onInsert: (code: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        MOTD-Formatierung (Farbcodes &amp; Stile)
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="space-y-2.5 border-t border-border px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            Minecraft-MOTDs verwenden <code className="rounded bg-muted px-1 py-0.5 font-mono">§</code>-Codes für Farben und
            Formatierung. Klicke einen Code, um ihn an der Cursorposition einzufügen. <code className="rounded bg-muted px-1 py-0.5 font-mono">\n</code>{" "}
            erzeugt eine zweite Zeile.
          </p>
          <div className="flex flex-wrap gap-1">
            {COLOR_CODES.map((c) => (
              <button
                key={c.code}
                type="button"
                title={`${c.label} (§${c.code})`}
                onClick={() => onInsert(`§${c.code}`)}
                className="flex items-center gap-1 rounded border border-border px-1.5 py-1 text-[11px] font-mono hover:border-primary"
              >
                <span className={cn("h-2.5 w-2.5 rounded-full border border-black/20")} style={{ backgroundColor: c.hex }} />
                §{c.code}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {FORMAT_CODES.map((f) => (
              <Button
                key={f.code}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 font-mono text-[11px]"
                title={f.label}
                onClick={() => onInsert(`§${f.code}`)}
              >
                §{f.code} {f.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
