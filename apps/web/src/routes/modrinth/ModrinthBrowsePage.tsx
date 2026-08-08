import { useState } from "react";
import { Puzzle, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { ModrinthResultCard } from "@/components/modrinth/ModrinthResultCard";
import { ModrinthFilterBar } from "@/components/modrinth/ModrinthFilterBar";
import { useModrinthSearch } from "@/lib/modrinth";
import { resolveTypeFilter, type TypeFilterValue } from "@/lib/modrinthDisplay";
import { paginationRange } from "@/lib/pagination";

const PAGE_SIZE = 24;

export default function ModrinthBrowsePage() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState<TypeFilterValue>("all");
  const [loader, setLoader] = useState("all");
  const [gameVersions, setGameVersions] = useState<string[]>([]);
  const [page, setPage] = useState(0);

  const { projectTypes, loaders } = resolveTypeFilter(type, loader);
  const search = useModrinthSearch({
    query,
    projectTypes,
    loaders,
    gameVersions,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  function resetToFirstPage<T>(setter: (v: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }

  const total = search.data?.total_hits ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = page + 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Modrinth</h1>
        <p className="text-sm text-muted-foreground">Browse plugins, mods and modpacks.</p>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>To install something, open a server&apos;s Plugins tab — installs are matched to that server&apos;s software and Minecraft version.</p>
      </div>

      <ModrinthFilterBar
        query={query}
        onQueryChange={resetToFirstPage(setQuery)}
        type={type}
        onTypeChange={resetToFirstPage((v: TypeFilterValue) => setType(v))}
        loader={loader}
        onLoaderChange={resetToFirstPage(setLoader)}
        gameVersions={gameVersions}
        onGameVersionsChange={resetToFirstPage(setGameVersions)}
      />

      {search.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      )}

      {!search.isLoading && (search.data?.hits.length ?? 0) === 0 && (
        <EmptyState icon={Puzzle} title="No results" description="Try different filters or a different search term." />
      )}

      {!search.isLoading && (search.data?.hits.length ?? 0) > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {search.data!.hits.map((hit) => (
              <ModrinthResultCard
                key={hit.project_id}
                hit={hit}
                action={{
                  label: "View",
                  onClick: () => window.open(`https://modrinth.com/project/${hit.slug}`, "_blank", "noopener,noreferrer"),
                }}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                {paginationRange(currentPage, totalPages).map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-sm text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      size="sm"
                      variant={p === currentPage ? "default" : "outline"}
                      className="w-9 px-0"
                      onClick={() => setPage(p - 1)}
                    >
                      {p}
                    </Button>
                  ),
                )}
                <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
