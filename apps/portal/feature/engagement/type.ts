import type { PageParams } from "@/lib/api/envelope";

/** Other users are only ever shown by name and avatar, never email (ADR-010 D5). */
export interface UserMini {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export type VoteValue = 1 | -1;

/** `GET /public/articles/{slug}/interactions` (ADR-010 §7.2). */
export interface InteractionSummary {
  articleId: string;
  upCount: number;
  downCount: number;
  commentCount: number;
}

/** `PUT|DELETE /me/articles/{id}/vote` — the new counts plus the caller's vote. */
export interface VoteResult extends InteractionSummary {
  myVote: VoteValue | null;
}

/** A public comment. `body` holds `<@userId>` tokens resolved by `mentions`. */
export interface Comment {
  id: string;
  author: UserMini;
  body: string;
  mentions: Record<string, UserMini>;
  createdAt: string;
  editedAt: string | null;
}

export type CommentStatus = "VISIBLE" | "HIDDEN";

/** The caller's own comment: also its moderation status and the version to send on edit. */
export interface MyComment extends Comment {
  status: CommentStatus;
  version: number;
}

export interface MyInteraction {
  vote: VoteValue | null;
  comment: MyComment | null;
}

/** `version` is omitted when creating and required when editing. */
export interface CommentInput {
  body: string;
  version?: number;
}

export type CommentListParams = Pick<PageParams, "limit">;

/** Something a Visitor tried before signing in; replayed once signed in (ADR-010 §8.3). */
export type PendingAction = { type: "vote"; value: VoteValue } | { type: "comment" };

export const COMMENT_MAX_LENGTH = 2000;
export const MAX_MENTIONS = 5;
export const COMMENTS_PAGE_SIZE = 10;
