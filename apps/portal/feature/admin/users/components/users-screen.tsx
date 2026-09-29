"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { parseAsInteger, parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/native-select";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { SearchInput } from "@/components/common/search-input";
import { useDebounce } from "@/hooks/use-debounce";
import { DEFAULT_TIME_ZONE, formatDate, formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/number";
import { useAdminProducts } from "@/feature/admin/products";
import { useAdminUsers } from "../hooks";
import { ADMIN_USER_PAGE_SIZES, ADMIN_USER_SORTS, type AdminUserSummary } from "../type";

/** Products the user joined, as small badges (first two, then `+n`). */
export function JoinedProducts({ products }: { products: AdminUserSummary["products"] }) {
  if (!products.length) return <span className="text-muted-foreground">—</span>;
  const shown = products.slice(0, 2);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((product) => (
        <Badge key={product.code} variant="outline">
          {product.name}
        </Badge>
      ))}
      {products.length > shown.length ? <Badge variant="secondary">+{products.length - shown.length}</Badge> : null}
    </span>
  );
}

/** `/admin/users` (UC-14, PRD A-3.1): who uses the services — profile, joined products, payments. */
export function UsersScreen() {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [query, setQuery] = useQueryStates({
    q: parseAsString.withDefault(""),
    product: parseAsString,
    sort: parseAsStringLiteral(ADMIN_USER_SORTS).withDefault("createdAt,desc"),
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
  });
  const [search, setSearch] = useState(query.q);
  const q = useDebounce(search, 300);
  const list = useAdminUsers({
    q: q || undefined,
    productCode: query.product ?? undefined,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
  });
  const products = useAdminProducts();
  const filtered = Boolean(q || query.product);
  const href = (user: AdminUserSummary) => `/admin/users/${user.id}`;

  return (
    <PageContainer>
      <PageHeader title={t("users.title")} description={t("users.description")} />
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <SearchInput
          className="lg:max-w-sm"
          search={search}
          onSearch={(value) => {
            setSearch(value);
            void setQuery({ q: value || null, page: 1 });
          }}
          placeholder={t("users.search")}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
          <NativeSelect
            aria-label={t("users.filters.product")}
            value={query.product ?? ""}
            onChange={(event) => void setQuery({ product: event.target.value || null, page: 1 })}
          >
            <option value="">{t("users.filters.allProducts")}</option>
            {(products.data ?? []).map((product) => (
              <option key={product.id} value={product.code}>
                {product.name}
              </option>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={t("users.filters.sort")}
            value={query.sort}
            onChange={(event) => void setQuery({ sort: event.target.value as (typeof ADMIN_USER_SORTS)[number], page: 1 })}
          >
            {ADMIN_USER_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(`users.sort.${sort.replace(",", "_")}`)}
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
          <EmptyState icon={Users} title={filtered ? t("users.noMatch") : t("users.empty")} description={filtered ? undefined : t("users.emptyDescription")} />
        </Card>
      ) : (
        <Card className="py-0">
          {/* Mobile: cards */}
          <ul className={list.isFetching ? "divide-y opacity-70 md:hidden" : "divide-y md:hidden"}>
            {list.data.data.map((user) => (
              <li key={user.id}>
                <Link href={href(user)} className="flex items-start justify-between gap-3 p-4 hover:bg-muted/40">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{user.name || user.email}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    <JoinedProducts products={user.products} />
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                    <span className="font-semibold tabular-nums">{formatMoney(user.paymentSummary.paidAmount)}</span>
                    <span className="text-xs text-muted-foreground">{t("users.paidCount", { count: user.paymentSummary.paidCount })}</span>
                    {user.role === "ADMIN" ? <Badge>{t("users.role.ADMIN")}</Badge> : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {/* Desktop: table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("users.columns.user")}</TableHead>
                  <TableHead>{t("users.columns.products")}</TableHead>
                  <TableHead className="text-right">{t("users.columns.paid")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("users.columns.lastPaid")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("users.columns.joined")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t("users.columns.lastSignIn")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={list.isFetching ? "opacity-70" : undefined}>
                {list.data.data.map((user) => (
                  <TableRow key={user.id} isHoverActive className="cursor-pointer" onClick={() => router.push(href(user))}>
                    <TableCell className="max-w-[18rem]">
                      <Link href={href(user)} className="flex items-center gap-2 font-medium hover:underline" onClick={(event) => event.stopPropagation()}>
                        <span className="truncate">{user.name || user.email}</span>
                        {user.role === "ADMIN" ? <Badge>{t("users.role.ADMIN")}</Badge> : null}
                      </Link>
                      <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <JoinedProducts products={user.products} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <span className="font-medium tabular-nums">{formatMoney(user.paymentSummary.paidAmount)}</span>
                      <span className="block text-xs text-muted-foreground">{t("users.paidCount", { count: user.paymentSummary.paidCount })}</span>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                      {formatDate(user.paymentSummary.lastPaidAt, { locale })}
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">{formatDate(user.createdAt, { locale })}</TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                      {formatDateTime(user.lastSignInAt, { locale })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination
            className="border-t"
            currentPage={query.page}
            totalRows={list.data.meta.total}
            rowsPerPage={query.limit}
            rowsPerPageOptions={ADMIN_USER_PAGE_SIZES}
            onPageChange={(page) => void setQuery({ page })}
            onRowsPerPageChange={(limit) => void setQuery({ limit, page: 1 })}
          />
        </Card>
      )}
      <p className="text-xs text-muted-foreground">{t("time.timezoneNote", { ns: "common", zone: DEFAULT_TIME_ZONE })}</p>
    </PageContainer>
  );
}
