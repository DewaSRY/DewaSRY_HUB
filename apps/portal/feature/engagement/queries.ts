import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { engagementClient } from "./client";
import { COMMENTS_PAGE_SIZE } from "./type";

export const engagementKeys = {
  all: ["engagement"] as const,
  article: (slug: string) => [...engagementKeys.all, "article", slug] as const,
  summary: (slug: string) => [...engagementKeys.article(slug), "summary"] as const,
  comments: (slug: string) => [...engagementKeys.article(slug), "comments"] as const,
  mine: (articleId: string) => [...engagementKeys.all, "mine", articleId] as const,
  mentionable: (q: string) => [...engagementKeys.all, "mentionable", q] as const,
};

export const interactionSummaryQuery = (slug: string) =>
  queryOptions({
    queryKey: engagementKeys.summary(slug),
    queryFn: () => engagementClient.getSummary({ slug }).then((response) => response.data.data),
  });

export const commentsQuery = (slug: string, limit = COMMENTS_PAGE_SIZE) =>
  infiniteQueryOptions({
    queryKey: engagementKeys.comments(slug),
    queryFn: ({ pageParam }) => engagementClient.listComments({ slug, page: pageParam, limit }).then((response) => response.data),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.total_page ? last.meta.page + 1 : undefined),
  });

export const myInteractionQuery = (articleId: string) =>
  queryOptions({
    queryKey: engagementKeys.mine(articleId),
    queryFn: () => engagementClient.getMine({ articleId }).then((response) => response.data.data),
  });

export const mentionableQuery = (q: string) =>
  queryOptions({
    queryKey: engagementKeys.mentionable(q),
    queryFn: () => engagementClient.searchMentionable({ q }).then((response) => response.data.data),
    staleTime: 60_000,
  });
