"use client";

import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ExternalLink } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineAlert } from "@/components/common/inline-alert";
import { PageHeader } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { CopyButton } from "@/components/common/copy-button";
import { DEFAULT_TIME_ZONE, formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/number";
import { useTransaction } from "../hooks";
import { isSnapUsable } from "../utils";
import { TransactionStatusBadge } from "./status-badge";

/** `/account/transactions/[orderId]` (UC-08, UC-11). A 404 means not found or not yours. */
export function TransactionDetail({ orderId }: { orderId: string }) {
  const { t } = useTranslation("billing");
  const { locale } = useParams<{ locale: string }>();
  const { data: tx, isPending, isError, error, refetch, isRefetching } = useTransaction(orderId);

  const back = (
    <Link href="/account/transactions" className="hover:text-foreground">
      {t("transactions.title")}
    </Link>
  );

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader title={orderId} breadcrumbs={[back]} breadcrumbLabel={t("breadcrumb", { ns: "common" })} />
        <QueryErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />
      </div>
    );
  }

  const rows: [string, React.ReactNode][] = [
    [t("detail.orderId"), (
      <span key="id" className="inline-flex items-center gap-1 font-mono">
        {tx.orderId}
        <CopyButton value={tx.orderId} label={t("detail.copyOrderId")} />
      </span>
    )],
    [t("transactions.product"), tx.product.name],
    [t("transactions.plan"), tx.plan.name],
    [t("transactions.amount"), <span key="amount" className="font-semibold">{formatMoney(tx.price)}</span>],
    [t("transactions.method"), tx.paymentMethod ? t(`method.${tx.paymentMethod}`) : "—"],
    [t("detail.createdAt"), formatDateTime(tx.createdAt, { locale })],
    [t("detail.paidAt"), formatDateTime(tx.paidAt, { locale })],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("detail.title")}
        breadcrumbs={[back]}
        breadcrumbLabel={t("breadcrumb", { ns: "common" })}
        titleAddon={<TransactionStatusBadge status={tx.status} />}
      />
      {tx.status === "PENDING" ? (
        <InlineAlert variant="warning" title={t("detail.pendingTitle")}>
          <p>{isSnapUsable(tx) ? t("detail.pendingDescription") : t("detail.pendingExpired")}</p>
          {isSnapUsable(tx) && tx.snap ? (
            <a href={tx.snap.redirectUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", className: "mt-2" })}>
              {t("checkout.openInstructions")}
              <ExternalLink aria-hidden />
            </a>
          ) : null}
        </InlineAlert>
      ) : null}
      {tx.status === "FAILED" && tx.failureReason ? <InlineAlert title={t("detail.failed")}>{tx.failureReason}</InlineAlert> : null}
      {tx.status === "REFUNDED" ? <InlineAlert variant="info" title={t("detail.refunded")} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>{t("detail.summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y rounded-lg border text-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="grid gap-1 px-4 py-3 sm:grid-cols-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="sm:col-span-2">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
      {tx.status === "PAID" ? (
        <Link href="/account/subscriptions" className={buttonVariants({ variant: "outline" })}>
          {t("checkout.viewSubscriptions")}
        </Link>
      ) : null}
      <p className="text-xs text-muted-foreground">{t("time.timezoneNote", { ns: "common", zone: DEFAULT_TIME_ZONE })}</p>
    </div>
  );
}
