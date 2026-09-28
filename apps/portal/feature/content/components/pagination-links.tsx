import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Page numbers to show: first, last, current ±1, with gaps as `null`. */
export function pageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | null)[] = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push(null);
    result.push(page);
  });
  return result;
}

export function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

/**
 * Server-rendered `?page=n` links (crawlable, no JavaScript), matching the
 * API's 1-based `page` (ADR-003 §3.4).
 */
export function PaginationLinks({
  basePath,
  page,
  totalPages,
  labels,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  labels: { nav: string; previous: string; next: string; page: (n: number) => string };
}) {
  if (totalPages <= 1) return null;
  const itemClass =
    "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md px-3 text-sm font-medium transition-colors";
  return (
    <nav aria-label={labels.nav} className="flex flex-wrap items-center justify-center gap-1.5 pt-4">
      {page > 1 ? (
        <Link href={pageHref(basePath, page - 1)} rel="prev" className={cn(itemClass, "border bg-card hover:bg-muted")}>
          <ChevronLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{labels.previous}</span>
        </Link>
      ) : null}
      {pageWindow(page, totalPages).map((item, index) =>
        item === null ? (
          <span key={`gap-${index}`} className="px-1 text-muted-foreground" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={item}
            href={pageHref(basePath, item)}
            aria-label={labels.page(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              itemClass,
              "tabular-nums",
              item === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={pageHref(basePath, page + 1)} rel="next" className={cn(itemClass, "border bg-card hover:bg-muted")}>
          <span className="hidden sm:inline">{labels.next}</span>
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </nav>
  );
}
