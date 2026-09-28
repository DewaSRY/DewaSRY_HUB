"use client";

import { Check, ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminImage } from "../type";
import { thumbnailUrl } from "../utils";

export function MediaThumb({ image, className }: { image: Pick<AdminImage, "variants" | "alt">; className?: string }) {
  const src = thumbnailUrl(image);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- CloudFront variants, already resized.
    <img src={src} alt={image.alt} loading="lazy" decoding="async" className={cn("size-full object-cover", className)} />
  ) : (
    <span className={cn("flex size-full items-center justify-center bg-muted text-muted-foreground", className)}>
      <ImageOff className="size-6" aria-hidden />
    </span>
  );
}

/** Thumbnail grid used by the library page and the picker dialog. */
export function MediaGrid({
  items,
  selectedId,
  onSelect,
  unusedLabel,
}: {
  items: AdminImage[];
  selectedId?: string | null;
  onSelect: (image: AdminImage) => void;
  unusedLabel?: string;
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((image) => {
        const selected = selectedId === image.id;
        return (
          <li key={image.id}>
            <button
              type="button"
              onClick={() => onSelect(image)}
              aria-pressed={selected}
              className={cn(
                "group relative block w-full overflow-hidden rounded-xl border bg-card text-left shadow-xs transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                selected && "ring-2 ring-primary",
              )}
            >
              <span className="block aspect-[4/3] overflow-hidden bg-muted">
                <MediaThumb image={image} className="transition-transform duration-300 group-hover:scale-[1.03]" />
              </span>
              <span className="block space-y-0.5 p-2.5">
                <span className="block truncate text-xs font-medium">{image.alt || image.fileName}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {image.width}×{image.height}
                  {unusedLabel && image.usedBy.length === 0 ? ` · ${unusedLabel}` : ""}
                </span>
              </span>
              {selected ? (
                <span className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground shadow">
                  <Check className="size-3.5" aria-hidden />
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
