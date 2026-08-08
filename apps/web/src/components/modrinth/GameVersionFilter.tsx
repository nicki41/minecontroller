import { ChevronDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useModrinthGameVersions } from "@/lib/modrinth";

/** Reused by the global Modrinth browser and any server-scoped install flow. */
export function GameVersionFilter({ selected, onChange }: { selected: string[]; onChange: (versions: string[]) => void }) {
  const { data, isLoading } = useModrinthGameVersions();
  const releases = data?.versions.filter((v) => v.version_type === "release") ?? [];

  function toggle(version: string, checked: boolean) {
    onChange(checked ? [...selected, version] : selected.filter((v) => v !== version));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-52 justify-between font-normal">
          Game Version{selected.length > 0 ? ` (${selected.length})` : ""}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        {selected.length > 0 && (
          <button
            type="button"
            className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-accent"
            onClick={() => onChange([])}
          >
            Clear selection
          </button>
        )}
        <div className="max-h-72 space-y-0.5 overflow-y-auto">
          {isLoading && <Skeleton className="h-40 w-full" />}
          {!isLoading && releases.length === 0 && <p className="p-2 text-xs text-muted-foreground">No versions found.</p>}
          {releases.map((v) => (
            <label
              key={v.version}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selected.includes(v.version)}
                onCheckedChange={(checked) => toggle(v.version, checked === true)}
              />
              {v.version}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
