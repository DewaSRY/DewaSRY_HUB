"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useTranslation } from "react-i18next";
import { Receipt, RotateCcw, TriangleAlert, UserRound, X } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InlineAlert } from "@/components/common/inline-alert";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { SearchInput } from "@/components/common/search-input";
import { useDebounce } from "@/hooks/use-debounce";
import { DEFAULT_TIME_ZONE, formatDateTime } from "@/lib/datetime";
import { formatMoney, formatNumber } from "@/lib/number";
import { cn } from "@/lib/utils";
import { TRANSACTION_STATUSES, TransactionStatusBadge } from "@/feature/billing";
import { useAdminProducts } from "@/feature/admin/products";
import { UserPickerDialog, useAdminUser } from "@/feature/admin/users";
import { useAdminTransactions } from "../hooks";
import { ADMIN_TRANSACTION_PAGE_SIZES, type AdminTransaction } from "../type";
import {
  ADMIN_TRANSACTION_SORTS,
  activeFilterCount,
  dateRangeToInstants,
  isInvertedRange,
  sortKey,
  toggleStatus,
  type AdminTransactionSort,
} from "../utils";

const FILTERS = {
  q: parseAsString.withDefault(""),
  user: parseAsString,
  product: parseAsString,
  status: parseAsArrayOf(parseAsStringLiteral(TRANSACTION_STATUSES)).withDefault([]),
  from: parseAsString,
  to: parseAsString,
  review: parseAsBoolean.withDefault(false),
  sort: parseAsStringLiteral(ADMIN_TRANSACTION_SORTS).withDefault("createdAt,desc"),
  page: parseAsInteger.withDefault(1),
  limit: parseAsInteger.withDefault(20),
};

export function NeedsReviewBadge() {
  const { t } = useTranslation("admin");
  return (
    <Badge variant="warning">
      <TriangleAlert aria-hidden />
      {t("transactions.needsReview")}
    </Badge>
  );
}

/**
 * `/admin/transactions` (UC-15, PRD A-3.2): every payment, filtered by user,
 * product, status, and date range. Filters live in the URL, so a filtered
 * view can be shared or bookmarked.
 */
export function TransactionsScreen() {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [query, setQuery] = useQueryStates(FILTERS);
  const [search, setSearch] = useState(query.q);
  const [pickerOpen, setPickerOpen] = useState(false);
  const q = useDebounce(search, 300);
  const inverted = isInvertedRange(query.from, query.to);
  const range = dateRangeToInstants(query.from, query.to);
  const list = useAdminTransactions({
    q: q || undefined,
    userId: query.user ?? undefined,
    productCode: query.product ?? undefined,
    status: query.status.length ? query.status : undefined,
    // An inverted range would match nothing; ignore it until it is fixed.
    from: inverted ? undefined : range.from,
    to: inverted ? undefined : range.to,
    needsReview: query.review || undefined,
    sort: query.sort,
    page: query.page,
    limit: query.limit,
  });
  const products = useAdminProducts();
  const selectedUser = useAdminUser(query.user);
  const filterCount = activeFilterCount({ ...query, q, userId: query.user, needsReview: query.review });
  const summary = list.data?.meta.summary;
  const href = (tx: AdminTransaction) => `/admin/transactions/${encodeURIComponent(tx.orderId)}`;

  function resetFilters() {
    setSearch("");
    void setQuery({ q: null, user: null, product: null, status: null, from: null, to: null, review: null, page: 1 });
  }

  return (
    <PageContainer>
      <PageHeader title={t("transactions.title")} description={t("transactions.description")} />

      <Card className="gap-3 p-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <SearchInput
            className="lg:max-w-sm"
            search={search}
            onSearch={(value) => {
              setSearch(value);
              void setQuery({ q: value || null, page: 1 });
            }}
            placeholder={t("transactions.search")}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-1">
            <Button
              variant="outline"
              className={cn("justify-start", query.user && "border-primary/40")}
              onClick={() => setPickerOpen(true)}
              aria-label={t("transactions.filters.user")}
            >
              <UserRound aria-hidden />
              <span className="truncate">
                {query.user
                  ? (selectedUser.data?.email ?? t("transactions.filters.selectedUser"))
                  : t("transactions.filters.allUsers")}
              </span>
            </Button>
            <NativeSelect
              aria-label={t("transactions.filters.product")}
              value={query.product ?? ""}
              onChange={(event) => void setQuery({ product: event.target.value || null, page: 1 })}
            >
              <option value="">{t("transactions.filters.allProducts")}</option>
              {(products.data ?? []).map((product) => (
                <option key={product.id} value={product.code}>
                  {product.name}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label={t("transactions.filters.sort")}
              value={query.sort}
              onChange={(event) => void setQuery({ sort: event.target.value as AdminTransactionSort, page: 1 })}
            >
              {ADMIN_TRANSACTION_SORTS.map((sort) => (
                <option key={sort} value={sort}>
                  {t(`transactions.sort.${sortKey(sort)}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("transactions.filters.status")}>
            {TRANSACTION_STATUSES.map((status) => {
              const active = query.status.includes(status);
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  onClick={() => void setQuery({ status: toggleStatus(query.status, status, TRANSACTION_STATUSES), page: 1 })}
                >
                  {t(`status.${status}`, { ns: "billing" })}
                </Button>
              );
            })}
            <Button
              size="sm"
              variant={query.review ? "default" : "outline"}
              aria-pressed={query.review}
              onClick={() => void setQuery({ review: query.review ? null : true, page: 1 })}
            >
              <TriangleAlert aria-hidden />
              {t("transactions.needsReview")}
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
            <label className="grid gap-1 text-xs text-muted-foreground">
              {t("transactions.filters.from")}
              <Input
                type="date"
                value={query.from ?? ""}
                max={query.to ?? undefined}
                onChange={(event) => void setQuery({ from: event.target.value || null, page: 1 })}
                aria-invalid={inverted || undefined}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              {t("transactions.filters.to")}
              <Input
                type="date"
                value={query.to ?? ""}
                min={query.from ?? undefined}
                onChange={(event) => void setQuery({ to: event.target.value || null, page: 1 })}
                aria-invalid={inverted || undefined}
              />
            </label>
            {filterCount ? (
              <Button variant="ghost" className="col-span-2 sm:col-span-1" onClick={resetFilters}>
                <RotateCcw aria-hidden />
                {t("transactions.filters.reset", { count: filterCount })}
              </Button>
            ) : null}
          </div>
        </div>
        {query.user ? (
          <div>
            <Badge variant="outline" className="h-6 gap-1 pr-0.5">
              {t("transactions.filters.userChip", { email: selectedUser.data?.email ?? query.user })}
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-5"
                aria-label={t("transactions.filters.clearUser")}
                onClick={() => void setQuery({ user: null, page: 1 })}
              >
                <X aria-hidden />
              </Button>
            </Badge>
          </div>
        ) : null}
        {inverted ? <InlineAlert variant="warning" title={t("transactions.filters.invertedRange")} /> : null}
      </Card>

      {summary ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            [t("transactions.summary.count"), formatNumber(summary.count)],
            [t("transactions.summary.paidCount"), formatNumber(summary.paidCount)],
            [t("transactions.summary.paidAmount"), formatMoney(summary.paidAmount)],
          ].map(([label, value]) => (
            <Card key={label} className="gap-1 px-3 py-3 sm:px-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="truncate text-base font-semibold tabular-nums sm:text-xl">{value}</p>
            </Card>
          ))}
        </div>
      ) : null}

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
          <EmptyState
            icon={Receipt}
            title={filterCount ? t("transactions.noMatch") : t("transactions.empty")}
            description={filterCount ? undefined : t("transactions.emptyDescription")}
            secondaryAction={filterCount ? { label: t("transactions.filters.resetAll"), onClick: resetFilters } : undefined}
          />
        </Card>
      ) : (
        <Card className="py-0">
          {/* Mobile: cards */}
          <ul className={cn("divide-y md:hidden", list.isFetching && "opacity-70")}>
            {list.data.data.map((tx) => (
              <li key={tx.orderId}>
                <Link href={href(tx)} className="flex items-start justify-between gap-3 p-4 hover:bg-muted/40">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">
                      {tx.product.name} · {tx.plan.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{tx.user.email}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt, { locale })}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{tx.orderId}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="font-semibold tabular-nums">{formatMoney(tx.price)}</span>
                    <TransactionStatusBadge status={tx.status} />
                    {tx.needsReview ? <NeedsReviewBadge /> : null}
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
                  <TableHead>{t("transactions.columns.date")}</TableHead>
                  <TableHead>{t("transactions.columns.user")}</TableHead>
                  <TableHead>{t("transactions.columns.product")}</TableHead>
                  <TableHead className="text-right">{t("transactions.columns.amount")}</TableHead>
                  <TableHead className="hidden xl:table-cell">{t("transactions.columns.method")}</TableHead>
                  <TableHead>{t("transactions.columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={list.isFetching ? "opacity-70" : undefined}>
                {list.data.data.map((tx) => (
                  <TableRow key={tx.orderId} isHoverActive className="cursor-pointer" onClick={() => router.push(href(tx))}>
                    <TableCell className="whitespace-nowrap">
                      <Link href={href(tx)} className="hover:underline" onClick={(event) => event.stopPropagation()}>
                        {formatDateTime(tx.createdAt, { locale })}
                      </Link>
                      <span className="block font-mono text-[11px] text-muted-foreground">{tx.orderId}</span>
                    </TableCell>
                    <TableCell className="max-w-[14rem]">
                      <span className="block truncate">{tx.user.name || tx.user.email}</span>
                      {tx.user.name ? <span className="block truncate text-xs text-muted-foreground">{tx.user.email}</span> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {tx.product.name}
                      <span className="block text-xs text-muted-foreground">{tx.plan.name}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap tabular-nums">{formatMoney(tx.price)}</TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {tx.paymentMethod ? t(`method.${tx.paymentMethod}`, { ns: "billing" }) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-wrap gap-1">
                        <TransactionStatusBadge status={tx.status} />
                        {tx.needsReview ? <NeedsReviewBadge /> : null}
                      </span>
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
            rowsPerPageOptions={ADMIN_TRANSACTION_PAGE_SIZES}
            onPageChange={(page) => void setQuery({ page })}
            onRowsPerPageChange={(limit) => void setQuery({ limit, page: 1 })}
          />
        </Card>
      )}
      <p className="text-xs text-muted-foreground">{t("time.timezoneNote", { ns: "common", zone: DEFAULT_TIME_ZONE })}</p>

      <UserPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        selectedId={query.user}
        onSelect={(user) => void setQuery({ user: user.id, page: 1 })}
      />
    </PageContainer>
  );
}
