import type { PageParams } from "@/lib/api/envelope";
import type { CommentStatus, UserMini } from "@/feature/engagement";

/** `AdminComment` (ADR-010 §7.1, admin 6.8): the admin also sees the author's email. */
export interface AdminComment {
  id: string;
  article: { id: string; slug: string; title: string | null };
  author: { id: string; name: string; email: string; avatarUrl: string | null };
  body: string;
  mentions: Record<string, UserMini>;
  status: CommentStatus;
  createdAt: string;
  editedAt: string | null;
}

export interface AdminCommentListParams extends PageParams {
  articleId?: string;
  status?: CommentStatus;
}

export const ADMIN_COMMENT_STATUSES = ["VISIBLE", "HIDDEN"] as const;
export const ADMIN_COMMENT_PAGE_SIZES = [20, 50, 100];
