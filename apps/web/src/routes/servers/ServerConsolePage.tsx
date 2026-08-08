import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, Search, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useServerLive } from "./ServerLiveContext";
import { useServerOutletContext } from "./useServerOutletContext";

const SCROLL_BOTTOM_THRESHOLD = 48;

export default function ServerConsolePage() {
  const { server } = useServerOutletContext();
  const { hasPermission } = useAuth();
  const { socketState, lines, sendCommand } = useServerLive();

  const [search, setSearch] = useState("");
  const [paused, setPaused] = useState(false);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);
  const canExecute = server.myAccessLevel === "FULL" && hasPermission("console.execute");

  const filtered = useMemo(() => {
    if (!search.trim()) return lines;
    const needle = search.toLowerCase();
    return lines.filter((l) => l.text.toLowerCase().includes(needle));
  }, [lines, search]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || paused) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered, paused]);

  function handleScroll() {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setPaused(distanceFromBottom > SCROLL_BOTTOM_THRESHOLD);
  }

  function jumpToBottom() {
    setPaused(false);
    requestAnimationFrame(() => {
      const el = viewportRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  function submitCommand(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;
    sendCommand(trimmed);
    setHistory((h) => [trimmed, ...h].slice(0, 100));
    setHistoryIndex(null);
    setCommand("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = historyIndex === null ? 0 : Math.min(historyIndex + 1, history.length - 1);
      if (history[nextIndex] !== undefined) {
        setHistoryIndex(nextIndex);
        setCommand(history[nextIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex - 1;
      if (nextIndex < 0) {
        setHistoryIndex(null);
        setCommand("");
      } else {
        setHistoryIndex(nextIndex);
        setCommand(history[nextIndex] ?? "");
      }
    }
  }

  return (
    <div className="flex h-[calc(100dvh-16rem)] min-h-[24rem] flex-col overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Badge variant={socketState === "open" ? "default" : "secondary"} className="gap-1">
          {socketState === "open" ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {socketState === "open" ? "Live" : socketState === "connecting" ? "Connecting…" : "Reconnecting…"}
        </Badge>
        <div className="relative ml-auto w-56">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search console..."
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <div ref={viewportRef} onScroll={handleScroll} className="relative flex-1 overflow-y-auto bg-background px-3 py-2 font-mono text-xs scrollbar-thin">
        {filtered.length === 0 && <p className="py-8 text-center text-muted-foreground">No console output yet.</p>}
        {filtered.map((line) => (
          <div key={line.id} className={cn("whitespace-pre-wrap break-all py-0.5", line.text.startsWith("> ") && "text-primary")}>
            {line.text}
          </div>
        ))}

        {paused && (
          <Button
            size="sm"
            variant="secondary"
            className="sticky bottom-2 left-full mr-2 shadow-md"
            onClick={jumpToBottom}
          >
            <ArrowDown className="h-3.5 w-3.5" /> Jump to bottom
          </Button>
        )}
      </div>

      <form onSubmit={submitCommand} className="flex items-center gap-2 border-t border-border p-2">
        <span className="pl-1 font-mono text-sm text-muted-foreground">{">"}</span>
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!canExecute}
          placeholder={canExecute ? "whitelist add Steve" : "You don't have permission to run commands"}
          className="h-8 flex-1 font-mono text-xs"
          autoComplete="off"
        />
        <Button type="submit" size="sm" disabled={!canExecute || !command.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
