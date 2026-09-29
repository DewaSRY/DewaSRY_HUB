"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { engagementClient } from "./client";
import { commentsQuery, engagementKeys, interactionSummaryQuery, mentionableQuery, myInteractionQuery } from "./queries";
import type { CommentInput, InteractionSummary, MyInteraction, VoteValue } from "./type";
import { applyVote } from "./utils";

export function useInteractionSummary(slug: string) {
  return useQuery(interactionSummaryQuery(slug));
}

export function useComments(slug: string) {
  return useInfiniteQuery(commentsQuery(slug));
}

/** The caller's vote and comment; only runs once signed in. */
export function useMyInteraction(articleId: string, enabled: boolean) {
  return useQuery({ ...myInteractionQuery(articleId), enabled });
}

export function useMentionSearch(q: string, enabled: boolean) {
  return useQuery({ ...mentionableQuery(q), enabled: enabled && q.length >= 2 });
}

/**
 * Public reads are cached by the browser for 10 s (ADR-010 §7.4), so a refetch
 * right after a write can return the old count. The count is moved locally
 * instead; the next natural refetch confirms it.
 */
function adjustCommentCount(queryClient: QueryClient, slug: string, delta: number) {
  queryClient.setQueryData<InteractionSummary>(engagementKeys.summary(slug), (summary) =>
    summary ? { ...summary, commentCount: Math.max(0, summary.commentCount + delta) } : summary,
  );
}

type VoteContext = { summary?: InteractionSummary; mine?: MyInteraction };

/**
 * UC-23 with an optimistic update: the button and count move at once and
 * roll back on error. `to: null` clears the vote.
 */
export function useVoteMutation(slug: string, articleId: string) {
  const queryClient = useQueryClient();
  const summaryKey = engagementKeys.summary(slug);
  const mineKey = engagementKeys.mine(articleId);

  return useMutation({
    mutationFn: ({ to }: { from: VoteValue | null; to: VoteValue | null }) =>
      (to === null ? engagementClient.clearVote({ articleId }) : engagementClient.vote({ articleId, value: to })).then(
        (response) => response.data.data,
      ),
    onMutate: async ({ from, to }): Promise<VoteContext> => {
      await Promise.all([queryClient.cancelQueries({ queryKey: summaryKey }), queryClient.cancelQueries({ queryKey: mineKey })]);
      const summary = queryClient.getQueryData<InteractionSummary>(summaryKey);
      const mine = queryClient.getQueryData<MyInteraction>(mineKey);
      if (summary) queryClient.setQueryData(summaryKey, applyVote(summary, from, to));
      queryClient.setQueryData<MyInteraction>(mineKey, { comment: mine?.comment ?? null, vote: to });
      return { summary, mine };
    },
    onError: (_error, _variables, context) => {
      if (context?.summary) queryClient.setQueryData(summaryKey, context.summary);
      if (context?.mine) queryClient.setQueryData(mineKey, context.mine);
    },
    onSuccess: ({ myVote, ...summary }) => {
      queryClient.setQueryData(summaryKey, summary);
      queryClient.setQueryData<MyInteraction>(mineKey, (mine) => ({ comment: mine?.comment ?? null, vote: myVote }));
    },
    meta: { errorMessage: { key: "engagement:toast.voteFailed" } },
  });
}

/** UC-24: create or edit the one comment. Errors are shown inline by the comment box. */
export function useSaveCommentMutation(slug: string, articleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CommentInput) => engagementClient.saveComment({ articleId, input }).then((response) => response.data.data),
    onSuccess: (comment, input) => {
      queryClient.setQueryData<MyInteraction>(engagementKeys.mine(articleId), (mine) => ({ vote: mine?.vote ?? null, comment }));
      if (input.version === undefined) adjustCommentCount(queryClient, slug, 1);
      void queryClient.invalidateQueries({ queryKey: engagementKeys.comments(slug) });
    },
    meta: {
      errorMessage: false,
      successMessage: (_data: unknown, input: CommentInput) => ({
        key: input.version === undefined ? "engagement:toast.commentPosted" : "engagement:toast.commentUpdated",
      }),
    },
  });
}

export function useDeleteCommentMutation(slug: string, articleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => engagementClient.deleteComment({ articleId }),
    onSuccess: () => {
      queryClient.setQueryData<MyInteraction>(engagementKeys.mine(articleId), (mine) => ({ vote: mine?.vote ?? null, comment: null }));
      adjustCommentCount(queryClient, slug, -1);
      void queryClient.invalidateQueries({ queryKey: engagementKeys.comments(slug) });
    },
    onError: () => {
      // A 409 (hidden by the moderator) or 404 means our copy is stale.
      void queryClient.invalidateQueries({ queryKey: engagementKeys.mine(articleId) });
    },
    meta: {
      successMessage: { key: "engagement:toast.commentDeleted" },
      errorMessage: { key: "engagement:toast.deleteFailed" },
    },
  });
}
