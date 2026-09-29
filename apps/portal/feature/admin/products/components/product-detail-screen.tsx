"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ExternalLink, Pencil, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CopyButton } from "@/components/common/copy-button";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { formatDate } from "@/lib/datetime";
import { formatNumber } from "@/lib/number";
import { useAdminProduct } from "../hooks";
import { CredentialsCard } from "./credentials-card";
import { PlansCard } from "./plans-card";
import { ProductFormDialog } from "./product-form-dialog";
import { ProductActiveBadge } from "./products-screen";
import { RedirectUrisCard } from "./redirect-uris-card";

/** `/admin/products/[id]` (UC-21): details, plans, client credentials, SSO redirect URIs. */
export function ProductDetailScreen({ id }: { id: string }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const { data: product, isPending, isError, error, refetch, isRefetching } = useAdminProduct(id);
  const [editOpen, setEditOpen] = useState(false);

  const back = (
    <Link href="/admin/products" className="hover:text-foreground">
      {t("products.title")}
    </Link>
  );

  if (isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageContainer>
    );
  }
  if (isError) {
    return (
      <PageContainer>
        <PageHeader title={t("products.detail.title")} breadcrumbs={[back]} breadcrumbLabel={t("breadcrumb", { ns: "common" })} />
        <QueryErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
      </PageContainer>
    );
  }

  const rows: [string, React.ReactNode][] = [
    [
      t("products.fields.code"),
      <span key="code" className="inline-flex items-center gap-1 font-mono">
        {product.code}
        <CopyButton value={product.code} label={t("products.detail.copyCode")} />
      </span>,
    ],
    [t("products.fields.description"), product.description || "—"],
    [
      t("products.fields.websiteUrl"),
      product.websiteUrl ? (
        <a key="url" href={product.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all hover:underline">
          {product.websiteUrl}
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
        </a>
      ) : (
        "—"
      ),
    ],
    [
      t("products.columns.members"),
      <Link key="members" href={`/admin/users?product=${encodeURIComponent(product.code)}`} className="inline-flex items-center gap-1 hover:underline">
        <Users className="size-3.5" aria-hidden />
        {formatNumber(product.memberCount)}
      </Link>,
    ],
    [t("products.columns.created"), formatDate(product.createdAt, { locale })],
  ];

  return (
    <PageContainer>
      <PageHeader
        title={product.name}
        breadcrumbs={[back]}
        breadcrumbLabel={t("breadcrumb", { ns: "common" })}
        titleAddon={<ProductActiveBadge active={product.active} />}
        actions={
          <>
            <Link href={`/admin/transactions?product=${encodeURIComponent(product.code)}`} className={buttonVariants({ variant: "outline" })}>
              {t("products.detail.viewTransactions")}
            </Link>
            <Button onClick={() => setEditOpen(true)}>
              <Pencil aria-hidden />
              {t("edit", { ns: "common" })}
            </Button>
          </>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("products.detail.overview")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y rounded-lg border text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="min-w-0 sm:col-span-2">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      <PlansCard product={product} />
      <div className="grid gap-6 lg:grid-cols-2">
        <CredentialsCard product={product} />
        <RedirectUrisCard product={product} />
      </div>
      <ProductFormDialog product={product} open={editOpen} onOpenChange={setEditOpen} />
    </PageContainer>
  );
}
