import { queryOptions } from "@tanstack/react-query";
import { adminCommentClient } from "./client";
import type { AdminCommentListParams } from "./type";

export const adminCommentKeys = {
  all: ["admin", "comments"] as const,
  lists: () => [...adminCommentKeys.all, "list"] as const,
  list: (params: AdminCommentListParams) => [...adminCommentKeys.lists(), params] as const,
};

export const adminCommentsQuery = (params: AdminCommentListParams) =>
  queryOptions({
    queryKey: adminCommentKeys.list(params),
    queryFn: () => adminCommentClient.list(params).then((response) => response.data),
  });
