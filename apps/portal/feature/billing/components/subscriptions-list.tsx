"use client";

import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { CreditCard, Package, RefreshCw, ShoppingCart } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryErrorState } from "@/components/common/query-error-state";
import { formatDate } from "@/lib/datetime";
import { formatMoney } from "@/lib/number";
import { checkoutHref, periodKey } from "@/feature/product";
import { useSubscriptions } from "../hooks";
import type { Subscription } from "../type";
import { daysLeft, subscriptionAction } from "../utils";
import { SubscriptionStatusBadge } from "./status-badge";

function ActionButton({ subscription }: { subscription: Subscription }) {
  const { t } = useTranslation("billing");
  const action = subscriptionAction(subscription);
  if (action.kind === "choose-plan") {
    return (
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <Link href={`/products/${action.productCode}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ShoppingCart aria-hidden />
          {t("subscriptions.choosePlan")}
        </Link>
        <p className="text-xs text-muted-foreground">{t("subscriptions.planRetired")}</p>
      </div>
    );
  }
  const href = `${checkoutHref(action.planCode, action.productCode)}&renew=1`;
  return (
    <Link href={href} className={buttonVariants({ size: "sm", variant: action.kind === "renew" ? "outline" : "default" })}>
      {action.kind === "renew" ? <RefreshCw aria-hidden /> : <CreditCard aria-hidden />}
      {action.kind === "renew" ? t("subscriptions.renew") : t("subscriptions.buyAgain")}
    </Link>
  );
}

/** `/account/subscriptions` (UC-10, UC-12): one row per product, entitled first. */
export function SubscriptionsList() {
  const { t } = useTranslation("billing");
  const { t: tProduct } = useTranslation("product");
  const { locale } = useParams<{ locale: string }>();
  const { data, isPending, isError, error, refetch, isRefetching } = useSubscriptions();

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    );
  }
  if (isError) return <QueryErrorState error={error} onRetry={() => refetch()} retrying={isRefetching} />;
  if (!data.length) {
    return (
      <Card>
        <EmptyState icon={Package} title={t("subscriptions.empty")} description={t("subscriptions.emptyDescription")}>
          <Link href="/products" className={buttonVariants()}>
            {t("subscriptions.browseProducts")}
          </Link>
        </EmptyState>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {data.map((subscription) => {
        const active = subscription.status === "ACTIVE" && subscription.entitled;
        const left = daysLeft(subscription.endDate);
        return (
          <li key={subscription.id}>
            <Card className={active ? "ring-primary/25" : undefined}>
              <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Package className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{subscription.product.name}</h2>
                      <SubscriptionStatusBadge subscription={subscription} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {subscription.plan.name} · {tProduct(`period.${periodKey(subscription.plan.billingPeriod)}`)} ·{" "}
                      {formatMoney(subscription.plan.price)}
                    </p>
                    <p className="text-sm">
                      {active
                        ? t("subscriptions.activeUntil", { date: formatDate(subscription.endDate, { locale }) })
                        : t("subscriptions.endedOn", { date: formatDate(subscription.endDate, { locale }) })}
                      {active && left <= 7 ? (
                        <span className="ml-2 text-xs font-medium text-warning">{t("subscriptions.daysLeft", { count: left })}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
                <ActionButton subscription={subscription} />
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
