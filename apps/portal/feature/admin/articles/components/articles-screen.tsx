"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, FileText, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EmptyState from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/native-select";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { SearchInput } from "@/components/common/search-input";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDateTime } from "@/lib/datetime";
import { pushToast } from "@/lib/toast/store";
import { useTaxonomyList } from "@/feature/admin/taxonomy";
import { CONTENT_LOCALES, languageName } from "@/feature/content";
import { useAdminArticles, useDeleteArticle, usePublishArticle } from "../hooks";
import type { AdminArticleSummary } from "../type";

const STATUSES = ["DRAFT", "PUBLISHED"] as const;

export function ArticleStatusBadge({ status }: { status: AdminArticleSummary["status"] }) {
  const { t } = useTranslation("admin");
  return <Badge variant={status === "PUBLISHED" ? "success" : "secondary"}>{t(`articles.status.${status}`)}</Badge>;
}

/** `/admin/articles` (UC-18): search, filter, open, publish/unpublish, delete. */
export function ArticlesScreen() {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [query, setQuery] = useQueryStates({
    q: parseAsString.withDefault(""),
    status: parseAsStringLiteral(STATUSES),
    category: parseAsString,
    tag: parseAsString,
    missing: parseAsStringLiteral(CONTENT_LOCALES),
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
  });
  const [search, setSearch] = useState(query.q);
  const q = useDebounce(search, 300);
  const list = useAdminArticles({
    q: q || undefined,
    status: query.status ?? undefined,
    category: query.category ?? undefined,
    tag: query.tag ?? undefined,
    missingLocale: query.missing ?? undefined,
    page: query.page,
    limit: query.limit,
  });
  const categories = useTaxonomyList("categories");
  const tags = useTaxonomyList("tags");
  const publish = usePublishArticle();
  const remove = useDeleteArticle();
  const [deleting, setDeleting] = useState<AdminArticleSummary | null>(null);

  function togglePublish(article: AdminArticleSummary) {
    const next = article.status !== "PUBLISHED";
    publish.mutate(
      { id: article.id, publish: next },
      {
        onSuccess: (updated) => {
          pushToast({
            variant: updated.revalidation?.status === "PENDING_RETRY" ? "error" : "success",
            title: {
              key:
                updated.revalidation?.status === "PENDING_RETRY"
                  ? "admin:articles.toast.revalidationPending"
                  : next
                    ? "admin:articles.toast.published"
                    : "admin:articles.toast.unpublished",
            },
          });
        },
        onError: (error) => {
          pushToast({
            variant: "error",
            title: { key: next ? "admin:articles.toast.publishFailed" : "admin:articles.toast.unpublishFailed" },
            description: (error as Error).message,
          });
        },
      },
    );
  }

  const filtered = Boolean(q || query.status || query.category || query.tag || query.missing);

  return (
    <PageContainer>
      <PageHeader
        title={t("articles.title")}
        description={t("articles.description")}
        actions={
          <Link href="/admin/articles/new" className={buttonVariants()}>
            <Plus aria-hidden />
            {t("articles.new")}
          </Link>
        }
      />
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput
          className="lg:max-w-sm"
          search={search}
          onSearch={(value) => {
            setSearch(value);
            void setQuery({ q: value || null, page: 1 });
          }}
          placeholder={t("articles.search")}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 lg:flex">
          <NativeSelect
            aria-label={t("articles.filters.status")}
            value={query.status ?? ""}
            onChange={(event) => void setQuery({ status: (event.target.value || null) as (typeof STATUSES)[number] | null, page: 1 })}
          >
            <option value="">{t("articles.filters.allStatuses")}</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`articles.status.${status}`)}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={t("articles.filters.category")}
            value={query.category ?? ""}
            onChange={(event) => void setQuery({ category: event.target.value || null, page: 1 })}
          >
            <option value="">{t("articles.filters.allCategories")}</option>
            {(categories.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={t("articles.filters.tag")}
            value={query.tag ?? ""}
            onChange={(event) => void setQuery({ tag: event.target.value || null, page: 1 })}
          >
            <option value="">{t("articles.filters.allTags")}</option>
            {(tags.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={t("articles.filters.language")}
            value={query.missing ?? ""}
            onChange={(event) => void setQuery({ missing: (event.target.value || null) as (typeof CONTENT_LOCALES)[number] | null, page: 1 })}
          >
            <option value="">{t("articles.filters.allLanguages")}</option>
            {CONTENT_LOCALES.map((item) => (
              <option key={item} value={item}>
                {t("articles.filters.missingLanguage", { language: languageName(item, locale) })}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>

      {list.isPending ? (
        <Card className="space-y-3 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      ) : list.isError ? (
        <QueryErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : list.data.data.length === 0 ? (
        <Card>
          <EmptyState icon={FileText} title={filtered ? t("articles.noMatch") : t("articles.empty")} description={filtered ? undefined : t("articles.emptyDescription")}>
            {!filtered ? (
              <Link href="/admin/articles/new" className={buttonVariants()}>
                <Plus aria-hidden />
                {t("articles.new")}
              </Link>
            ) : null}
          </EmptyState>
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("articles.columns.title")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("articles.columns.languages")}</TableHead>
                <TableHead>{t("articles.columns.status")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("articles.columns.category")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("articles.columns.updated")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("actions", { ns: "common" })}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className={list.isFetching ? "opacity-70" : undefined}>
              {list.data.data.map((article) => (
                <TableRow key={article.id} isHoverActive>
                  <TableCell className="max-w-[28rem]">
                    <Link href={`/admin/articles/${article.id}`} className="block truncate font-medium hover:underline">
                      {article.title || t("articles.untitled")}
                    </Link>
                    <span className="block truncate font-mono text-xs text-muted-foreground">/{article.slug}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <ul className="flex gap-1" aria-label={t("articles.columns.languages")}>
                      {CONTENT_LOCALES.map((item) => {
                        const has = article.locales?.includes(item);
                        return (
                          <li
                            key={item}
                            title={`${languageName(item, locale)}: ${has ? t("articles.languages.written") : t("articles.languages.missing")}`}
                            className={
                              has
                                ? "rounded border border-success/40 bg-success/10 px-1.5 font-mono text-[11px] uppercase text-success"
                                : "rounded border border-dashed px-1.5 font-mono text-[11px] uppercase text-muted-foreground line-through"
                            }
                          >
                            {item}
                          </li>
                        );
                      })}
                    </ul>
                  </TableCell>
                  <TableCell>
                    <ArticleStatusBadge status={article.status} />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{article.category?.name ?? "—"}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                    {formatDateTime(article.updatedAt, { locale })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("moreActions", { ns: "common" })} />}>
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/admin/articles/${article.id}`)}>
                          <Pencil aria-hidden /> {t("edit", { ns: "common" })}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push(`/admin/articles/${article.id}/preview`)}>
                          <Eye aria-hidden /> {t("articles.preview")}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePublish(article)} disabled={publish.isPending}>
                          {article.status === "PUBLISHED" ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
                          {article.status === "PUBLISHED" ? t("articles.unpublish") : t("articles.publish")}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            remove.reset();
                            setDeleting(article);
                          }}
                        >
                          <Trash2 aria-hidden /> {t("delete", { ns: "common" })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination
            className="border-t"
            currentPage={query.page}
            totalRows={list.data.meta.total}
            rowsPerPage={query.limit}
            rowsPerPageOptions={[10, 20, 50]}
            onPageChange={(page) => void setQuery({ page })}
            onRowsPerPageChange={(limit) => void setQuery({ limit, page: 1 })}
          />
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("articles.deleteTitle", { title: deleting?.title })}
        description={deleting?.status === "PUBLISHED" ? t("articles.deletePublished") : t("articles.deleteDraft")}
        destructive
        confirmLabel={t("delete", { ns: "common" })}
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      >
        {remove.error ? <ApiErrorAlert error={remove.error} /> : null}
      </ConfirmDialog>
    </PageContainer>
  );
}
