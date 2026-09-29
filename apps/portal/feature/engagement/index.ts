/**
 * `feature/engagement` barrel (ADR-010) — votes, comments, mentions.
 *
 * Only light, client-safe exports: the public article page imports the lazy
 * island from here, so nothing that pulls in Firebase or the comment box may
 * be exported directly (the island loads them with `next/dynamic`).
 */
export type * from "./type";
export { COMMENT_MAX_LENGTH, MAX_MENTIONS } from "./type";
export { splitCommentBody, type CommentSegment } from "./utils";
export { ArticleInteractionsLazy } from "./components/article-interactions-lazy";
export { CommentBody } from "./components/comment-body";
