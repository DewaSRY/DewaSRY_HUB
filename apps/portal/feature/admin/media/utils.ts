import { ALT_MAX, MEDIA_MAX_BYTES } from "./type";

/** Alt text suggestion from a file name: `my-diagram_v2.png` → `My diagram v2`. */
export function altFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
  const text = base ? base.charAt(0).toUpperCase() + base.slice(1) : "";
  return text.slice(0, ALT_MAX);
}

export type FileProblem = "type" | "size" | null;

/** Client-side pre-check; the API and Nginx check again (UC-19). */
export function checkImageFile(file: Pick<File, "type" | "size">): FileProblem {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "type";
  if (file.size > MEDIA_MAX_BYTES) return "size";
  return null;
}

/** The smallest variant ≥ `min`, for thumbnails. */
export function thumbnailUrl(image: { variants: { width: number; url: string }[] }, min = 480): string | null {
  const sorted = [...image.variants].sort((a, b) => a.width - b.width);
  return (sorted.find((variant) => variant.width >= min) ?? sorted[sorted.length - 1])?.url ?? null;
}
