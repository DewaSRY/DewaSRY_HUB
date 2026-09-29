import type { AxiosResponse } from "axios";
import { BaseClient } from "@/lib/api/base-client";
import type { ApiPage, ApiResponse } from "@/lib/api/envelope";
import type {
  Comment,
  CommentInput,
  InteractionSummary,
  MyComment,
  MyInteraction,
  UserMini,
  VoteResult,
  VoteValue,
} from "./type";

const slugPath = (slug: string) => `/public/articles/${encodeURIComponent(slug)}`;
const minePath = (articleId: string) => `/me/articles/${encodeURIComponent(articleId)}`;

/**
 * Article interactions (ADR-010 §7.1). Public reads are called from the
 * browser (never from ISR), so a vote or comment never rebuilds the page.
 */
class EngagementClient extends BaseClient {
  getSummary({ slug }: { slug: string }): Promise<AxiosResponse<ApiResponse<InteractionSummary>>> {
    return this.get({ endpoint: `${slugPath(slug)}/interactions` });
  }

  listComments({ slug, page, limit }: { slug: string; page: number; limit: number }): Promise<AxiosResponse<ApiPage<Comment>>> {
    return this.get({ endpoint: `${slugPath(slug)}/comments`, params: { page, limit, sort: "createdAt,desc" } });
  }

  getMine({ articleId }: { articleId: string }): Promise<AxiosResponse<ApiResponse<MyInteraction>>> {
    return this.get({ endpoint: `${minePath(articleId)}/interaction` });
  }

  vote({ articleId, value }: { articleId: string; value: VoteValue }): Promise<AxiosResponse<ApiResponse<VoteResult>>> {
    return this.put({ endpoint: `${minePath(articleId)}/vote`, body: { value } });
  }

  clearVote({ articleId }: { articleId: string }): Promise<AxiosResponse<ApiResponse<VoteResult>>> {
    return this.delete({ endpoint: `${minePath(articleId)}/vote` });
  }

  saveComment({ articleId, input }: { articleId: string; input: CommentInput }): Promise<AxiosResponse<ApiResponse<MyComment>>> {
    return this.put({ endpoint: `${minePath(articleId)}/comment`, body: input });
  }

  deleteComment({ articleId }: { articleId: string }): Promise<AxiosResponse<void>> {
    return this.delete({ endpoint: `${minePath(articleId)}/comment` });
  }

  searchMentionable({ q }: { q: string }): Promise<AxiosResponse<ApiResponse<UserMini[]>>> {
    return this.get({ endpoint: "/me/mentionable-users", params: { q } });
  }
}

export const engagementClient = new EngagementClient();
