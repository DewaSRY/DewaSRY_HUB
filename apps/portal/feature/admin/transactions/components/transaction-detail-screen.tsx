"use client";

import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { CopyButton } from "@/components/common/copy-button";
import { InlineAlert } from "@/components/common/inline-alert";
import { PageContainer, PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { DEFAULT_TIME_ZONE, formatDate, formatDateTime } from "@/lib/datetime";
import { toApiError } from "@/lib/api/error";
import { formatMoney } from "@/lib/number";
import { SubscriptionStatusBadge, TransactionStatusBadge } from "@/feature/billing";
import { useAdminTransaction, useSyncTransaction } from "../hooks";
import type { AdminTransactionDetail, StatusHistoryEntry } from "../type";
import { NeedsReviewBadge } from "./transactions-screen";

/**
 * `/admin/transactions/[orderId]` (UC-15): full detail, status history, and
 * "Sync with Midtrans" (re-reads the Midtrans Status API). Read-only otherwise:
 * there is no refund endpoint (PRD OQ6).
 */
export function TransactionDetailScreen({ orderId }: { orderId: string }) {
  const { t } = useTranslation("admin");
  const { data: tx, isPending, isError, error, refetch, isRefetching } = useAdminTransaction(orderId);
  const sync = useSyncTransaction();

  const back = (
    <Link href="/admin/transactions" className="hover:text-foreground">
      {t("transactions.title")}
    </Link>
  );

  if (isPending) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </PageContainer>
    );
  }
  if (isError) {
    return (
      <PageContainer>
        <PageHeader title={orderId} breadcrumbs={[back]} breadcrumbLabel={t("breadcrumb", { ns: "common" })} />
        <QueryErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
      </PageContainer>
    );
  }

  const syncError = toApiError(sync.error);

  return (
    <PageContainer>
      <PageHeader
        title={tx.orderId}
        breadcrumbs={[back]}
        breadcrumbLabel={t("breadcrumb", { ns: "common" })}
        titleAddon={
          <span className="flex flex-wrap items-center gap-1.5">
            <TransactionStatusBadge status={tx.status} />
            {tx.needsReview ? <NeedsReviewBadge /> : null}
          </span>
        }
        description={t("transactions.detail.description")}
        actions={
          <Button onClick={() => sync.mutate(tx.orderId)} loading={sync.isPending}>
            <RefreshCw aria-hidden />
            {t("transactions.sync.button")}
          </Button>
        }
      />

      {sync.error ? (
        <ApiErrorAlert
          error={sync.error}
          title={syncError?.status === 502 ? t("transactions.sync.upstreamTitle") : t("transactions.sync.failedTitle")}
        />
      ) : null}
      {tx.needsReview ? (
        <InlineAlert variant="warning" title={t("transactions.detail.reviewTitle")}>
          {t("transactions.detail.reviewDescription")}
        </InlineAlert>
      ) : null}
      {tx.status === "FAILED" && tx.failureReason ? (
        <InlineAlert title={t("transactions.detail.failureReason")}>{tx.failureReason}</InlineAlert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SummaryCard tx={tx} />
          <SubscriptionCard tx={tx} />
        </div>
        <HistoryCard history={tx.statusHistory} />
      </div>
      <p className="text-xs text-muted-foreground">
        {t("time.timezoneNote", { ns: "common", zone: DEFAULT_TIME_ZONE })} {t("transactions.detail.syncNote")}
      </p>
    </PageContainer>
  );
}

function SummaryCard({ tx }: { tx: AdminTransactionDetail }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const rows: [string, React.ReactNode][] = [
    [
      t("transactions.detail.orderId"),
      <span key="id" className="inline-flex items-center gap-1 font-mono break-all">
        {tx.orderId}
        <CopyButton value={tx.orderId} label={t("transactions.detail.copyOrderId")} />
      </span>,
    ],
    [
      t("transactions.columns.user"),
      <Link key="user" href={`/admin/users/${tx.user.id}`} className="hover:underline">
        <span className="block">{tx.user.name || tx.user.email}</span>
        {tx.user.name ? <span className="block text-xs text-muted-foreground">{tx.user.email}</span> : null}
      </Link>,
    ],
    [t("transactions.columns.product"), `${tx.product.name} · ${tx.plan.name}`],
    [t("transactions.columns.amount"), <span key="amount" className="font-semibold tabular-nums">{formatMoney(tx.price)}</span>],
    [t("transactions.columns.method"), tx.paymentMethod ? t(`method.${tx.paymentMethod}`, { ns: "billing" }) : "—"],
    [
      t("transactions.detail.gatewayId"),
      tx.gatewayTransactionId ? (
        <span key="gw" className="inline-flex items-center gap-1 font-mono text-xs break-all">
          {tx.gatewayTransactionId}
          <CopyButton value={tx.gatewayTransactionId} label={t("transactions.detail.copyGatewayId")} />
        </span>
      ) : (
        <span key="gw" className="text-muted-foreground">{t("transactions.detail.gatewayUnknown")}</span>
      ),
    ],
    [t("transactions.detail.createdAt"), formatDateTime(tx.createdAt, { locale })],
    [t("transactions.detail.paidAt"), formatDateTime(tx.paidAt, { locale })],
  ];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transactions.detail.summary")}</CardTitle>
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
  );
}

function SubscriptionCard({ tx }: { tx: AdminTransactionDetail }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const subscription = tx.subscription;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transactions.detail.subscription")}</CardTitle>
        {!subscription ? <CardDescription>{t("transactions.detail.noSubscription")}</CardDescription> : null}
      </CardHeader>
      {subscription ? (
        <CardContent>
          <div className="flex flex-col gap-2 rounded-lg border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {subscription.product.name} · {subscription.plan.name}
              </span>
              <span className="block text-xs text-muted-foreground">
                {formatDate(subscription.startDate, { locale })} – {formatDate(subscription.endDate, { locale })}
              </span>
            </span>
            <SubscriptionStatusBadge subscription={subscription} />
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function HistoryCard({ history }: { history: StatusHistoryEntry[] }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("transactions.detail.history")}</CardTitle>
        <CardDescription>{t("transactions.detail.historyDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("transactions.detail.noHistory")}</p>
        ) : (
          <ol className="relative space-y-5 border-l pl-5">
            {history.map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="relative">
                <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-primary ring-4 ring-card" aria-hidden />
                <div className="flex flex-wrap items-center gap-1.5">
                  {entry.fromStatus ? (
                    <>
                      <TransactionStatusBadge status={entry.fromStatus} />
                      <ArrowRight className="size-3 text-muted-foreground" aria-label={t("transactions.detail.to")} />
                    </>
                  ) : null}
                  <TransactionStatusBadge status={entry.status} />
                  <Badge variant="outline">{t(`transactions.source.${entry.source}`)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.at, { locale })}</p>
                {entry.note ? <p className="mt-1 text-sm break-words">{entry.note}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
