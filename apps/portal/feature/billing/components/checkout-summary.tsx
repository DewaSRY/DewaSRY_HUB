"use client";

import { CalendarClock, Package, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/number";
import { periodKey, type Plan, type Product } from "@/feature/product";

/** Order summary (UC-08 step 1): product, plan, period, price, and the one-time notice. */
export function CheckoutSummary({ product, plan }: { product: Pick<Product, "name" | "description">; plan: Plan }) {
  const { t } = useTranslation("billing");
  const { t: tProduct } = useTranslation("product");
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Package className="size-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{product.name}</p>
          <h2 className="text-xl font-semibold">{plan.name}</h2>
        </div>
      </div>
      <dl className="divide-y rounded-xl border text-sm">
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-muted-foreground">{t("checkout.period")}</dt>
          <dd className="flex items-center gap-1.5 font-medium">
            <CalendarClock className="size-4 text-muted-foreground" aria-hidden />
            {tProduct(`period.${periodKey(plan.billingPeriod)}`)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4 px-4 py-3">
          <dt className="text-muted-foreground">{t("checkout.price")}</dt>
          <dd className="font-medium">{formatMoney(plan.price)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 bg-muted/40 px-4 py-3">
          <dt className="font-semibold">{t("checkout.total")}</dt>
          <dd className="text-lg font-bold">{formatMoney(plan.price)}</dd>
        </div>
      </dl>
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        {t("checkout.oneTimeNotice")}
      </p>
    </div>
  );
}
