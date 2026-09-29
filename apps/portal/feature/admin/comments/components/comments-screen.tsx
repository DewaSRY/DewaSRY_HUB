"use client";

import { useParams } from "next/navigation";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, ExternalLink, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/native-select";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { DEFAULT_TIME_ZONE, formatDateTime } from "@/lib/datetime";
import { CommentBody } from "@/feature/engagement";
import { useAdminComments, useSetCommentStatus } from "../hooks";
import { ADMIN_COMMENT_PAGE_SIZES, ADMIN_COMMENT_STATUSES, type AdminComment } from "../type";

function CommentRow({ comment }: { comment: AdminComment }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const setStatus = useSetCommentStatus();
  const hidden = comment.status === "HIDDEN";
  const busy = setStatus.isPending;

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{comment.author.name}</span>
          <span className="truncate text-xs text-muted-foreground">{comment.author.email}</span>
          <Badge variant={hidden ? "warning" : "success"}>{t(`comments.status.${comment.status}`)}</Badge>
        </div>
        <div className={hidden ? "opacity-60" : undefined}>
          <CommentBody body={comment.body} mentions={comment.mentions} />
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <a
            href={`/${locale}/blog/${encodeURIComponent(comment.article.slug)}#discussion`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
          >
            {comment.article.title ?? comment.article.slug}
            <ExternalLink className="size-3" aria-hidden />
          </a>
          <span aria-hidden>·</span>
          <time dateTime={comment.createdAt}>{formatDateTime(comment.createdAt, { locale })}</time>
          {comment.editedAt ? (
            <>
              <span aria-hidden>·</span>
              <span>{t("comments.edited", { date: formatDateTime(comment.editedAt, { locale }) })}</span>
            </>
          ) : null}
        </p>
      </div>
      <Button
        size="sm"
        variant={hidden ? "outline" : "destructive"}
        loading={busy}
        onClick={() => setStatus.mutate({ id: comment.id, status: hidden ? "VISIBLE" : "HIDDEN" })}
        className="shrink-0"
      >
        {hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
        {hidden ? t("comments.show") : t("comments.hide")}
      </Button>
    </li>
  );
}

/** `/admin/comments` (UC-26, ADR-010 I7): read reader comments and hide or show them. */
export function CommentsScreen() {
  const { t } = useTranslation("admin");
  const [query, setQuery] = useQueryStates({
    status: parseAsStringLiteral(ADMIN_COMMENT_STATUSES),
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
  });
  const list = useAdminComments({ status: query.status ?? undefined, page: query.page, limit: query.limit });

  return (
    <PageContainer>
      <PageHeader title={t("comments.title")} description={t("comments.description")} />
      <div className="flex">
        <NativeSelect
          aria-label={t("comments.filters.status")}
          value={query.status ?? ""}
          onChange={(event) =>
            void setQuery({ status: (event.target.value || null) as (typeof ADMIN_COMMENT_STATUSES)[number] | null, page: 1 })
          }
        >
          <option value="">{t("comments.filters.all")}</option>
          {ADMIN_COMMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`comments.status.${status}`)}
            </option>
          ))}
        </NativeSelect>
      </div>

      {list.isPending ? (
        <Card className="space-y-3 p-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </Card>
      ) : list.isError ? (
        <QueryErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : list.data.data.length === 0 ? (
        <Card>
          <EmptyState icon={MessageSquare} title={query.status ? t("comments.noMatch") : t("comments.empty")} />
        </Card>
      ) : (
        <Card className="py-0">
          <ul className={list.isFetching ? "divide-y opacity-70" : "divide-y"}>
            {list.data.data.map((comment) => (
              <CommentRow key={comment.id} comment={comment} />
            ))}
          </ul>
          <Pagination
            className="border-t"
            currentPage={query.page}
            totalRows={list.data.meta.total}
            rowsPerPage={query.limit}
            rowsPerPageOptions={ADMIN_COMMENT_PAGE_SIZES}
            onPageChange={(page) => void setQuery({ page })}
            onRowsPerPageChange={(limit) => void setQuery({ limit, page: 1 })}
          />
        </Card>
      )}
      <p className="text-xs text-muted-foreground">{t("time.timezoneNote", { ns: "common", zone: DEFAULT_TIME_ZONE })}</p>
    </PageContainer>
  );
}
