"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { EMBED_PROVIDERS, embedFrameSrc } from "../../../article-schema/embed-providers";
import type { EmbedProvider } from "../../../article-schema/types";

/**
 * Click-to-load facade (ADR-009 §7.3): a fixed 16:9 box with the provider
 * name and a play button. The iframe — lazy, sandboxed, strict referrer — is
 * added only after a click, so no third-party script or cookie loads first.
 */
export function EmbedFacade({
  provider,
  id,
  caption,
  loadLabel,
  noticeLabel,
}: {
  provider: EmbedProvider;
  id: string;
  caption?: string | null;
  loadLabel: string;
  noticeLabel: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const spec = EMBED_PROVIDERS[provider];
  const src = embedFrameSrc(provider, id);
  if (!src) return null;
  const thumbnail = spec.thumbnail?.(id);
  const title = caption || spec.label;

  return (
    <figure className="article-embed not-prose my-8">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border bg-muted">
        {loaded ? (
          <iframe
            src={src}
            title={title}
            loading="lazy"
            allow={spec.allow}
            allowFullScreen
            sandbox={spec.sandbox}
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="group absolute inset-0 flex size-full flex-col items-center justify-center gap-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={loadLabel}
          >
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element -- provider thumbnail, loaded lazily.
              <img
                src={thumbnail}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
              />
            ) : (
              <span
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_60%)]"
              />
            )}
            <span className="relative flex size-14 items-center justify-center rounded-full bg-background/90 shadow-lg ring-1 ring-foreground/10 transition-transform group-hover:scale-105">
              <Play className="ml-0.5 size-6 fill-current" aria-hidden />
            </span>
            <span className="relative rounded-full bg-background/90 px-3 py-1 text-xs font-medium shadow-sm">
              {noticeLabel}
            </span>
          </button>
        )}
      </div>
      {caption ? <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  );
}
