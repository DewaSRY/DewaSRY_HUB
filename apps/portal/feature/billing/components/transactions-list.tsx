"use client";

import { useParams } from "next/navigation";
import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { Receipt } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import Pagination from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect } from "@/components/ui/native-select";
import { QueryErrorState } from "@/components/common/query-error-state";
import { DEFAULT_TIME_ZONE, formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/number";
import { useTransactions } from "../hooks";
import { TRANSACTION_STATUSES } from "../type";
import { TransactionStatusBadge } from "./status-badge";

const PAGE_SIZES = [10, 20, 50];

/** `/account/transactions` (UC-11): own transactions, newest first, `?page=n`. */
export function TransactionsList() {
  const { t } = useTranslation("billing");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const [query, setQuery] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    limit: parseAsInteger.withDefault(20),
    status: parseAsStringLiteral(TRANSACTION_STATUSES),
  });
  const params = { page: query.page, limit: query.limit, status: query.status ?? undefined };
  const { data, isPending, isError, error, refetch, isRefetching, isFetching } = useTransactions(params);

  const filters = (
    <div className="flex flex-wrap items-center gap-2">
      <NativeSelect
        aria-label={t("transactions.filterStatus")}
        value={query.status ?? ""}
        onChange={(event) =>
          void setQuery({ status: (event.target.value || null) as (typeof TRANSACTION_STATUSES)[number] | null, page: 1 })
        }
      >
        <option value="">{t("transactions.allStatuses")}</option>
        {TRANSACTION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(`status.${status}`)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );

  if (isError) return <QueryErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />;

  return (
    <div className="space-y-4">
      {filters}
      <Card className="py-0">
        {isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <EmptyState icon={Receipt} title={t("transactions.empty")} description={t("transactions.emptyDescription")}>
            <Link href="/products" className={buttonVariants({ variant: "outline" })}>
              {t("transactions.browseProducts")}
            </Link>
          </EmptyState>
        ) : (
          <>
            {/* Mobile: cards */}
            <ul className="divide-y md:hidden">
              {data.data.map((tx) => (
                <li key={tx.orderId}>
                  <Link href={`/account/transactions/${encodeURIComponent(tx.orderId)}`} className="flex items-start justify-between gap-3 p-4 hover:bg-muted/40">
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-medium">
                        {tx.product.name} · {tx.plan.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(tx.createdAt, { locale })}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{tx.orderId}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="font-semibold tabular-nums">{formatMoney(tx.price)}</span>
                      <TransactionStatusBadge status={tx.status} />
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
                    <TableHead>{t("transactions.date")}</TableHead>
                    <TableHead>{t("transactions.product")}</TableHead>
                    <TableHead>{t("transactions.plan")}</TableHead>
                    <TableHead className="text-right">{t("transactions.amount")}</TableHead>
                    <TableHead>{t("transactions.method")}</TableHead>
                    <TableHead>{t("transactions.status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className={isFetching ? "opacity-70" : undefined}>
                  {data.data.map((tx) => (
                    <TableRow
                      key={tx.orderId}
                      isHoverActive
                      className="cursor-pointer"
                      onClick={() => router.push(`/account/transactions/${encodeURIComponent(tx.orderId)}`)}
                    >
                      <TableCell className="whitespace-nowrap">
                        <Link href={`/account/transactions/${encodeURIComponent(tx.orderId)}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                          {formatDateTime(tx.createdAt, { locale })}
                        </Link>
                        <p className="font-mono text-[11px] text-muted-foreground">{tx.orderId}</p>
                      </TableCell>
                      <TableCell>{tx.product.name}</TableCell>
                      <TableCell>{tx.plan.name}</TableCell>
                      <TableCell className="text-right font-medium tabular-nums">{formatMoney(tx.price)}</TableCell>
                      <TableCell>{tx.paymentMethod ? t(`method.${tx.paymentMethod}`) : "—"}</TableCell>
                      <TableCell>
                        <TransactionStatusBadge status={tx.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Pagination
              className="border-t"
              currentPage={query.page}
              totalRows={data.meta.total}
              rowsPerPage={query.limit}
              rowsPerPageOptions={PAGE_SIZES}
              onPageChange={(page) => void setQuery({ page })}
              onRowsPerPageChange={(limit) => void setQuery({ limit, page: 1 })}
            />
          </>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">{t("time.timezoneNote", { ns: "common", zone: DEFAULT_TIME_ZONE })}</p>
    </div>
  );
}
