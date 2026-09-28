export type TaxonomyKind = "categories" | "tags";

/** `[{ id, name, slug, articleCount, publishedCount }]` (ADR-003 §10.5, §10.6). */
export interface AdminTaxonomy {
  id: string;
  name: string;
  slug: string;
  articleCount: number;
  publishedCount: number;
  revalidation?: { status: "OK" | "PENDING_RETRY"; paths: string[] } | null;
}

export interface TaxonomyInput {
  name: string;
  slug?: string;
}
