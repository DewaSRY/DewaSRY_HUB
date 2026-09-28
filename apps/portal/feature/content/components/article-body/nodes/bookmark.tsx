import { ExternalLink } from "lucide-react";

/** Link card: title, description, and domain. No remote image. */
export function Bookmark({
  url,
  title,
  description,
  siteName,
  newTabLabel,
}: {
  url: string;
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
  newTabLabel: string;
}) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // keep the raw url
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="article-bookmark not-prose group my-6 flex items-start gap-4 rounded-xl border bg-card p-4 no-underline shadow-xs transition-colors hover:border-primary/40 hover:bg-muted/40"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-foreground group-hover:text-primary">{title || host}</span>
        {description ? (
          <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{description}</span>
        ) : null}
        <span className="mt-2 block truncate text-xs text-muted-foreground">
          {siteName ? `${siteName} · ` : ""}
          {host}
        </span>
      </span>
      <ExternalLink className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">{newTabLabel}</span>
    </a>
  );
}
