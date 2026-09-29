/**
 * Public barrel of `feature/admin/articles` (UC-16–UC-18, ADR-009 §5–§6).
 * Imported only by `app/[locale]/(admin)/**` (rule I4). The Tiptap editor
 * is not exported: the editor page loads it with `next/dynamic`.
 */
export type * from "./type";
export { adminArticleKeys, articleQuery, articlesQuery } from "./queries";
export { useAdminArticle, useAdminArticles } from "./hooks";
export { ArticlesScreen, ArticleStatusBadge } from "./components/articles-screen";
export { ArticleEditorPage } from "./components/article-editor-page";
export { ArticlePreviewScreen } from "./components/article-preview-screen";
