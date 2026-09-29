"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Package, Plus } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { SearchInput } from "@/components/common/search-input";
import { formatDate } from "@/lib/datetime";
import { formatNumber } from "@/lib/number";
import { useAdminProducts } from "../hooks";
import type { AdminProduct, IssuedCredential } from "../type";
import { CredentialSecretDialog } from "./credential-secret-dialog";
import { ProductFormDialog } from "./product-form-dialog";

export function ProductActiveBadge({ active }: { active: boolean }) {
  const { t } = useTranslation("admin");
  return <Badge variant={active ? "success" : "secondary"}>{active ? t("products.status.active") : t("products.status.inactive")}</Badge>;
}

/**
 * `/admin/products` (UC-21, PRD G3): every product incl. inactive. Onboarding
 * a new SaaS product is configuration only — create it here, then add plans,
 * credentials, and redirect URIs on its page.
 */
export function ProductsScreen() {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const list = useAdminProducts();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  // The first credential of a new product; shown once, then we open the product.
  const [created, setCreated] = useState<{ product: AdminProduct; credential: IssuedCredential } | null>(null);

  const items = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const data = list.data ?? [];
    return needle ? data.filter((item) => item.name.toLowerCase().includes(needle) || item.code.includes(needle)) : data;
  }, [list.data, search]);

  function onCreated(product: AdminProduct) {
    if (product.credential) setCreated({ product, credential: product.credential });
    else router.push(`/admin/products/${product.id}`);
  }

  const openCreate = () => setFormOpen(true);

  return (
    <PageContainer>
      <PageHeader
        title={t("products.title")}
        description={t("products.description")}
        actions={
          <Button onClick={openCreate}>
            <Plus aria-hidden />
            {t("products.new")}
          </Button>
        }
      />
      <SearchInput className="sm:max-w-sm" search={search} onSearch={setSearch} placeholder={t("products.search")} />
      {list.isPending ? (
        <Card className="space-y-3 p-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </Card>
      ) : list.isError ? (
        <QueryErrorState error={list.error} onRetry={() => list.refetch()} retrying={list.isRefetching} />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={search ? t("products.noMatch") : t("products.empty")}
            description={search ? undefined : t("products.emptyDescription")}
            primaryAction={search ? undefined : { label: t("products.new"), onClick: openCreate, icon: Plus }}
          />
        </Card>
      ) : (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("products.columns.product")}</TableHead>
                <TableHead>{t("products.columns.status")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t("products.columns.plans")}</TableHead>
                <TableHead className="hidden text-right md:table-cell">{t("products.columns.members")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("products.columns.created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((product) => (
                <TableRow
                  key={product.id}
                  isHoverActive
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/products/${product.id}`)}
                >
                  <TableCell className="max-w-[20rem]">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="block truncate font-medium hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {product.name}
                    </Link>
                    <span className="block truncate font-mono text-xs text-muted-foreground">{product.code}</span>
                    <span className="text-xs text-muted-foreground sm:hidden">
                      {t("products.planCount", { count: product.planCount })}
                    </span>
                  </TableCell>
                  <TableCell>
                    <ProductActiveBadge active={product.active} />
                  </TableCell>
                  <TableCell className="hidden text-right tabular-nums sm:table-cell">{product.planCount}</TableCell>
                  <TableCell className="hidden text-right tabular-nums md:table-cell">{formatNumber(product.memberCount)}</TableCell>
                  <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                    {formatDate(product.createdAt, { locale })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ProductFormDialog product={null} open={formOpen} onOpenChange={setFormOpen} onCreated={onCreated} />
      <CredentialSecretDialog
        credential={created?.credential ?? null}
        onClose={() => {
          const id = created?.product.id;
          setCreated(null);
          if (id) router.push(`/admin/products/${id}`);
        }}
      />
    </PageContainer>
  );
}
