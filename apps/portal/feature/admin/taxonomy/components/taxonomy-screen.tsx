"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderTree, MoreHorizontal, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { SearchInput } from "@/components/common/search-input";
import { toApiError } from "@/lib/api/error";
import { useDeleteTaxonomy, useTaxonomyList } from "../hooks";
import type { AdminTaxonomy, TaxonomyKind } from "../type";
import { TaxonomyFormDialog } from "./taxonomy-form-dialog";

/** `/admin/categories` and `/admin/tags` (UC-20). */
export function TaxonomyScreen({ kind }: { kind: TaxonomyKind }) {
  const { t } = useTranslation("admin");
  const list = useTaxonomyList(kind);
  const remove = useDeleteTaxonomy(kind);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminTaxonomy | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminTaxonomy | null>(null);
  const isCategory = kind === "categories";
  const Icon = isCategory ? FolderTree : Tags;
  const prefix = isCategory ? "taxonomy.categories" : "taxonomy.tags";

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const data = list.data ?? [];
    return needle ? data.filter((item) => item.name.toLowerCase().includes(needle) || item.slug.includes(needle)) : data;
  }, [list.data, search]);

  const deleteError = toApiError(remove.error);
  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader
        title={t(`${prefix}.title`)}
        description={t(`${prefix}.description`)}
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            {t(`${prefix}.new`)}
          </Button>
        }
      />
      <SearchInput className="sm:max-w-sm" search={search} onSearch={setSearch} placeholder={t("taxonomy.search")} />
      {list.isPending ? (
        <Card className="space-y-3 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </Card>
      ) : list.isError ? (
        <QueryErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Icon}
            title={search ? t("taxonomy.noMatch") : t(`${prefix}.empty`)}
            description={search ? undefined : t(`${prefix}.emptyDescription`)}
            primaryAction={search ? undefined : { label: t(`${prefix}.new`), onClick: openCreate, icon: Plus }}
          />
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("taxonomy.name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("taxonomy.slug")}</TableHead>
                <TableHead className="text-right">{t("taxonomy.articles")}</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">{t("actions", { ns: "common" })}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {item.name}
                    <span className="block font-mono text-xs text-muted-foreground sm:hidden">{item.slug}</span>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs text-muted-foreground sm:table-cell">{item.slug}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Link
                      href={`/admin/articles?${isCategory ? "category" : "tag"}=${item.id}`}
                      className="hover:underline"
                    >
                      {item.articleCount}
                    </Link>
                    <Badge variant="outline" className="ml-2">
                      {t("taxonomy.published", { count: item.publishedCount })}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("moreActions", { ns: "common" })} />}>
                        <MoreHorizontal aria-hidden />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditing(item);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil aria-hidden /> {t("taxonomy.rename")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => {
                            remove.reset();
                            setDeleting(item);
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
        </Card>
      )}

      <TaxonomyFormDialog kind={kind} item={editing} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t(`${prefix}.deleteTitle`, { name: deleting?.name })}
        description={
          isCategory
            ? deleting?.articleCount
              ? t("taxonomy.categories.deleteInUse", { count: deleting.articleCount })
              : t("taxonomy.categories.deleteDescription")
            : t("taxonomy.tags.deleteDescription", { count: deleting?.articleCount ?? 0 })
        }
        destructive
        confirmLabel={t("delete", { ns: "common" })}
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      >
        {remove.error ? (
          <ApiErrorAlert
            error={remove.error}
            title={deleteError?.status === 409 ? t("taxonomy.categories.inUseTitle") : undefined}
          />
        ) : null}
      </ConfirmDialog>
    </PageContainer>
  );
}
