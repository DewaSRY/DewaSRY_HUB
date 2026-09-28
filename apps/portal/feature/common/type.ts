export type { ApiPage, ApiResponse, Money, PageMeta, PageParams } from "@/lib/api/envelope";

/** Translate function shape passed into pure helpers. */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

export type SearchParamsRecord = Record<string, string | string[] | undefined>;
