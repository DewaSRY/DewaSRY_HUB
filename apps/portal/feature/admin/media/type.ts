import type { ImageAsset } from "@/feature/content";
import type { PageParams } from "@/lib/api/envelope";

export interface ImageUsage {
  id: string;
  title: string;
  usage: "COVER" | "BODY";
}

/** `AdminImage` (ADR-003 §10.4) = `Image` + file data and usage. */
export interface AdminImage extends ImageAsset {
  fileName: string;
  contentHash: string;
  sizeBytes: number;
  usedBy: ImageUsage[];
  createdAt: string;
}

export interface MediaListParams extends PageParams {
  q?: string;
  unused?: boolean;
}

export interface UploadMediaInput {
  file: File;
  alt: string;
}

export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp";
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const ALT_MAX = 250;
