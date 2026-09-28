/**
 * Public barrel of `feature/content`: types, the article schema, pure
 * helpers, and isomorphic components (safe in Server and Client
 * Components). Server reads live in `./server` and are imported by path
 * (rule I5).
 */
export type * from "./type";
export * from "./article-schema";
export { lowlight, grammarFor } from "./article-schema/lowlight";
export * from "./utils";
export * from "./utils/article";
export { ArticleBody, renderDoc } from "./components/article-body/article-body";
export type { RenderDocOptions, SkippedNode } from "./components/article-body/context";
export { DEFAULT_LABELS as DEFAULT_ARTICLE_BODY_LABELS } from "./components/article-body/labels";
export type { ArticleBodyLabels } from "./components/article-body/labels";
export { ResponsiveImage, Figure, buildSrcSet, pickVariant } from "./components/article-body/nodes/figure";
export { ArticleCard } from "./components/article-card";
export { PaginationLinks, pageWindow, pageHref } from "./components/pagination-links";
export { TableOfContents } from "./components/table-of-contents";
