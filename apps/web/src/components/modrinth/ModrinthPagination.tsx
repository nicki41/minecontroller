import { Button } from "@/components/ui/button";
import { paginationRange } from "@/lib/pagination";

interface ModrinthPaginationProps {
  /** 0-indexed. */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Shared page-number strip for any Modrinth search result list — reused by the global browser and any server-scoped install flow so paging behaves identically everywhere. */
export function ModrinthPagination({ page, pageSize, total, onPageChange }: ModrinthPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = page + 1;
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-xs text-muted-foreground">
        {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
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
              onClick={() => onPageChange(p - 1)}
            >
              {p}
            </Button>
          ),
        )}
        <Button size="sm" variant="outline" disabled={currentPage >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
