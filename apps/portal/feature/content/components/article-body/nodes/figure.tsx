import type { BodyImage, ImageWidth } from "../../../article-schema/types";
import { cn } from "@/lib/utils";

const SIZES: Record<ImageWidth, string> = {
  content: "(min-width: 768px) 70ch, 100vw",
  wide: "(min-width: 1024px) 960px, 100vw",
  full: "100vw",
};

export function buildSrcSet(image: Pick<BodyImage, "variants">): string {
  return [...image.variants]
    .filter((variant) => variant.url && variant.width > 0)
    .sort((a, b) => a.width - b.width)
    .map((variant) => `${variant.url} ${variant.width}w`)
    .join(", ");
}

/** The variant closest to (but not below) `target`, else the largest. */
export function pickVariant(image: Pick<BodyImage, "variants">, target = 960) {
  const sorted = [...image.variants].sort((a, b) => a.width - b.width);
  return sorted.find((variant) => variant.width >= target) ?? sorted[sorted.length - 1];
}

interface ImageProps {
  image: BodyImage;
  alt?: string | null;
  width?: ImageWidth;
  priority?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * `<img srcset sizes width height>` built from the media variants
 * (480/960/1600). Width and height always come from the API, so there is no
 * layout shift. The cover passes `priority` (eager + `fetchpriority=high`).
 */
export function ResponsiveImage({ image, alt, width = "content", priority, sizes, className }: ImageProps) {
  const fallback = pickVariant(image);
  if (!fallback) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- images are pre-resized on CloudFront (ADR-001 §5.9).
    <img
      src={fallback.url}
      srcSet={buildSrcSet(image)}
      sizes={sizes ?? SIZES[width]}
      width={image.width}
      height={image.height}
      alt={alt ?? image.alt ?? ""}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
      className={cn("h-auto w-full rounded-lg bg-muted object-cover", className)}
    />
  );
}

export function Figure({
  image,
  alt,
  caption,
  width = "content",
}: {
  image: BodyImage;
  alt?: string | null;
  caption?: string | null;
  width?: ImageWidth;
}) {
  return (
    <figure className="article-figure not-prose" data-width={width}>
      <ResponsiveImage image={image} alt={alt} width={width} />
      {caption ? (
        <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
