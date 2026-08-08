import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LOADER_OPTIONS, TYPE_FILTER_OPTIONS, type TypeFilterValue } from "@/lib/modrinthDisplay";
import { GameVersionFilter } from "./GameVersionFilter";

/**
 * Search + Type + Loader + Game Version controls shared by the global
 * Modrinth browser and any server-scoped install flow, so filter behavior
 * (and the facets sent to the search API) never diverges between the two.
 * Type/Loader are each rendered only when their onChange handler is passed —
 * a server-scoped page that already knows its loader can omit onLoaderChange
 * and show it as a fixed badge instead.
 */
interface ModrinthFilterBarProps {
  query: string;
  onQueryChange: (v: string) => void;
  searchPlaceholder?: string;
  type?: TypeFilterValue;
  onTypeChange?: (v: TypeFilterValue) => void;
  loader?: string;
  onLoaderChange?: (v: string) => void;
  gameVersions: string[];
  onGameVersionsChange: (v: string[]) => void;
}

export function ModrinthFilterBar({
  query,
  onQueryChange,
  searchPlaceholder = "Search Modrinth...",
  type,
  onTypeChange,
  loader,
  onLoaderChange,
  gameVersions,
  onGameVersionsChange,
}: ModrinthFilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={query} onChange={(e) => onQueryChange(e.target.value)} placeholder={searchPlaceholder} className="pl-7" />
      </div>

      {onTypeChange && (
        <Select value={type} onValueChange={(v) => onTypeChange(v as TypeFilterValue)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {onLoaderChange && (
        <Select value={loader} onValueChange={onLoaderChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Loader" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All loaders</SelectItem>
            {LOADER_OPTIONS.map((group) => (
              <SelectGroup key={group.group}>
                <SelectLabel>{group.group}</SelectLabel>
                {group.loaders.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      )}

      <GameVersionFilter selected={gameVersions} onChange={onGameVersionsChange} />
    </div>
  );
}
