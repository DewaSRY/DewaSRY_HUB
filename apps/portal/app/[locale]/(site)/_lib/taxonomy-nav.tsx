import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Taxonomy } from "@/feature/content";

/** Category chips above the blog lists (UC-03). */
export function TaxonomyNav({
  categories,
  active,
  allLabel,
  label,
}: {
  categories: Taxonomy[];
  active?: string;
  allLabel: string;
  label: string;
}) {
  if (!categories.length) return null;
  const chip = "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors";
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2 pb-1">
        <li>
          <Link href="/blog" aria-current={!active ? "page" : undefined} className={cn(chip, !active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
            {allLabel}
          </Link>
        </li>
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/blog/category/${category.slug}`}
              aria-current={active === category.slug ? "page" : undefined}
              className={cn(
                chip,
                active === category.slug ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {category.name}
              <span className="text-xs opacity-70 tabular-nums">{category.articleCount}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
