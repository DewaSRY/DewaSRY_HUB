import { CalendarDays } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import type { ArticleSummary } from "../type";
import { languageName } from "../utils/locales";
import { ResponsiveImage } from "./article-body/nodes/figure";

interface Props {
  article: ArticleSummary;
  locale: string;
  /** `featured` = large card for the first item of a list. */
  variant?: "default" | "featured" | "compact";
  priority?: boolean;
  className?: string;
}

/** Title, excerpt, 480 px cover, category, and publish date (UC-01, UC-03). */
export function ArticleCard({ article, locale, variant = "default", priority, className }: Props) {
  // Not translated into the page language yet: say which language the card is in.
  const otherLanguage = article.locale && article.locale !== locale ? article.locale : null;
  const featured = variant === "featured";
  const compact = variant === "compact";
  return (
    <article
      lang={otherLanguage ?? undefined}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md",
        featured && "md:grid md:grid-cols-2",
        className,
      )}
    >
      {!compact ? (
        <div className={cn("relative aspect-[16/9] overflow-hidden bg-muted", featured && "md:aspect-auto md:h-full")}>
          {article.coverImage ? (
            <ResponsiveImage
              image={article.coverImage}
              sizes={featured ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
              priority={priority}
              className="size-full rounded-none transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              aria-hidden
              className="size-full bg-[radial-gradient(circle_at_20%_20%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_55%),radial-gradient(circle_at_80%_80%,color-mix(in_oklch,var(--info)_18%,transparent),transparent_50%)]"
            />
          )}
        </div>
      ) : null}
      <div className={cn("flex flex-1 flex-col gap-3 p-5", featured && "md:justify-center md:p-8")}>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {article.category ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
              {article.category.name}
            </span>
          ) : null}
          {article.publishedAt ? (
            <time dateTime={article.publishedAt} className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDate(article.publishedAt, { locale })}
            </time>
          ) : null}
          {otherLanguage ? (
            <span
              lang={locale}
              title={languageName(otherLanguage, locale)}
              className="rounded border px-1.5 py-px font-mono text-[10px] tracking-wide uppercase"
            >
              {otherLanguage}
            </span>
          ) : null}
        </div>
        <h3
          className={cn(
            "font-semibold tracking-tight text-foreground",
            featured ? "text-2xl md:text-3xl" : "text-lg",
          )}
        >
          <Link href={`/blog/${article.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {article.title}
          </Link>
        </h3>
        {article.excerpt ? (
          <p className={cn("text-sm leading-relaxed text-muted-foreground", featured ? "line-clamp-4 md:text-base" : "line-clamp-3")}>
            {article.excerpt}
          </p>
        ) : null}
        {article.tags.length && !compact ? (
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-1" aria-label="Tags">
            {article.tags.slice(0, 3).map((tag) => (
              <li key={tag.slug} className="text-xs text-muted-foreground">
                #{tag.name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
