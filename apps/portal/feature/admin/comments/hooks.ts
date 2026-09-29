"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CommentStatus } from "@/feature/engagement";
import { adminCommentClient } from "./client";
import { adminCommentKeys, adminCommentsQuery } from "./queries";
import type { AdminCommentListParams } from "./type";

export function useAdminComments(params: AdminCommentListParams) {
  return useQuery({ ...adminCommentsQuery(params), placeholderData: keepPreviousData });
}

/** Hide or show one comment (UC-26). Public pages pick it up within the 10 s cache (ADR-010 §7.4). */
export function useSetCommentStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CommentStatus }) =>
      (status === "HIDDEN" ? adminCommentClient.hide({ id }) : adminCommentClient.show({ id })).then((response) => response.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminCommentKeys.all }),
    meta: {
      successMessage: (_data: unknown, variables: { status: CommentStatus }) => ({
        key: variables.status === "HIDDEN" ? "admin:comments.toast.hidden" : "admin:comments.toast.shown",
      }),
      errorMessage: { key: "admin:comments.toast.failed" },
    },
  });
}
