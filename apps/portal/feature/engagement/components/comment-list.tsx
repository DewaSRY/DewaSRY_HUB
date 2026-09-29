"use client";

import { MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { QueryErrorState } from "@/components/common/query-error-state";
import { useComments } from "../hooks";
import { CommentItem } from "./comment-item";

/**
 * Public comments, newest first, 10 at a time. The caller's own comment is
 * shown in the comment box instead, so it is left out here (`excludeId`).
 */
export function CommentList({ slug, excludeId }: { slug: string; excludeId?: string | null }) {
  const { t } = useTranslation("engagement");
  const comments = useComments(slug);

  if (comments.isPending) return null;
  if (comments.isError) {
    return (
      <QueryErrorState
        error={comments.error}
        title={t("section.loadFailed")}
        onRetry={() => comments.refetch()}
        retrying={comments.isRefetching}
      />
    );
  }

  const items = comments.data.pages.flatMap((page) => page.data).filter((comment) => comment.id !== excludeId);
  if (!items.length && !comments.hasNextPage) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
        <MessageSquare className="size-4 shrink-0" aria-hidden />
        {t("comments.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ol className="space-y-6">
        {items.map((comment) => (
          <li key={comment.id}>
            <CommentItem comment={comment} />
          </li>
        ))}
      </ol>
      {comments.hasNextPage ? (
        <Button variant="outline" className="w-full" onClick={() => comments.fetchNextPage()} loading={comments.isFetchingNextPage}>
          {t("comments.loadMore")}
        </Button>
      ) : null}
    </div>
  );
}
