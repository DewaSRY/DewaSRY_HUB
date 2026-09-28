import { CloudOff, Newspaper } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AdSlot } from "@/components/ads/ad-slot";
import { ArticleCard, PaginationLinks, type ArticleSummary } from "@/feature/content";

/** Article grid + `?page=n` links + a list ad slot, shared by /blog, category, and tag pages. */
export function ArticleList({
  articles,
  locale,
  page,
  totalPages,
  basePath,
  unavailable,
  labels,
}: {
  articles: ArticleSummary[];
  locale: string;
  page: number;
  totalPages: number;
  basePath: string;
  unavailable: boolean;
  labels: {
    empty: string;
    emptyDescription: string;
    unavailable: string;
    backToBlog?: string;
    advertisement: string;
    pagination: { nav: string; previous: string; next: string; page: (n: number) => string };
  };
}) {
  if (unavailable) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
        <CloudOff className="size-6" aria-hidden />
        {labels.unavailable}
      </div>
    );
  }
  if (!articles.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-muted/20 px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Newspaper className="size-5" aria-hidden />
        </span>
        <p className="font-semibold">{labels.empty}</p>
        <p className="max-w-sm text-sm text-muted-foreground">{labels.emptyDescription}</p>
        {labels.backToBlog ? (
          <Link href="/blog" className={buttonVariants({ variant: "outline", className: "mt-2" })}>
            {labels.backToBlog}
          </Link>
        ) : null}
      </div>
    );
  }
  const [first, ...others] = articles;
  const showFeatured = page === 1;
  const grid = showFeatured ? others : articles;
  return (
    <div className="space-y-8">
      {showFeatured && first ? <ArticleCard article={first} locale={locale} variant="featured" priority /> : null}
      {grid.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {grid.slice(0, 6).map((article, index) => (
            <ArticleCard key={article.id} article={article} locale={locale} priority={!showFeatured && index < 3} />
          ))}
        </div>
      ) : null}
      {grid.length > 6 ? (
        <>
          <AdSlot slot="list" label={labels.advertisement} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {grid.slice(6).map((article) => (
              <ArticleCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
        </>
      ) : null}
      <PaginationLinks basePath={basePath} page={page} totalPages={totalPages} labels={labels.pagination} />
    </div>
  );
}
