"use client";

import { CheckCircle2, Clock, ExternalLink, Loader2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Transaction } from "../type";
import { entitlementRefreshUrl, isSnapUsable } from "../utils";

/** "Payment processing" while polling (UC-08 step 7). */
export function PaymentProcessing() {
  const { t } = useTranslation("billing");
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center" role="status" aria-live="polite">
      <Loader2 className="size-10 animate-spin text-primary" aria-hidden />
      <h2 className="text-xl font-semibold">{t("checkout.processingTitle")}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t("checkout.processingDescription")}</p>
    </div>
  );
}

/** After 2 minutes still PENDING: the payment instructions (QRIS / virtual account). */
export function PendingInstructions({
  transaction,
  onReopen,
  onCheckAgain,
  checking,
}: {
  transaction: Transaction;
  onReopen?: () => void;
  onCheckAgain: () => void;
  checking: boolean;
}) {
  const { t } = useTranslation("billing");
  const usable = isSnapUsable(transaction);
  const method = transaction.paymentMethod;
  return (
    <div className="space-y-5 py-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-warning/10 text-warning">
          <Clock className="size-6" aria-hidden />
        </span>
        <h2 className="text-xl font-semibold">{t("checkout.pendingTitle")}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{t("checkout.pendingDescription")}</p>
      </div>
      <ol className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
        <li>1. {method === "QRIS" ? t("checkout.instructions.qris") : method === "BANK_TRANSFER" ? t("checkout.instructions.va") : t("checkout.instructions.generic")}</li>
        <li>2. {t("checkout.instructions.keepPage")}</li>
        <li>3. {t("checkout.instructions.history")}</li>
      </ol>
      <div className="flex flex-wrap justify-center gap-2">
        {usable && onReopen ? <Button onClick={onReopen}>{t("checkout.reopenPayment")}</Button> : null}
        {usable && transaction.snap ? (
          <a href={transaction.snap.redirectUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
            {t("checkout.openInstructions")}
            <ExternalLink aria-hidden />
          </a>
        ) : null}
        <Button variant="outline" onClick={onCheckAgain} loading={checking}>
          {t("checkout.checkAgain")}
        </Button>
        <Link href={`/account/transactions/${encodeURIComponent(transaction.orderId)}`} className={buttonVariants({ variant: "ghost" })}>
          {t("checkout.viewTransaction")}
        </Link>
      </div>
    </div>
  );
}

export function PaymentSuccess({ transaction, productWebsite }: { transaction: Transaction; productWebsite?: string | null }) {
  const { t } = useTranslation("billing");
  const back = entitlementRefreshUrl(productWebsite);
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
      <span className="flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
        <CheckCircle2 className="size-8" aria-hidden />
      </span>
      <h2 className="text-2xl font-semibold">{t("checkout.successTitle")}</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("checkout.successDescription", { product: transaction.product.name, plan: transaction.plan.name })}
      </p>
      <p className="font-mono text-xs text-muted-foreground">{transaction.orderId}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Link href="/account/subscriptions" className={buttonVariants()}>
          {t("checkout.viewSubscriptions")}
        </Link>
        {back ? (
          <a href={back} className={buttonVariants({ variant: "outline" })}>
            {t("checkout.backToProduct", { product: transaction.product.name })}
            <ExternalLink aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

export function PaymentFailed({ transaction, onRetry }: { transaction: Transaction; onRetry: () => void }) {
  const { t } = useTranslation("billing");
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center" role="alert">
      <span className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <XCircle className="size-8" aria-hidden />
      </span>
      <h2 className="text-2xl font-semibold">{t("checkout.failedTitle")}</h2>
      <p className="max-w-md text-sm text-muted-foreground">{transaction.failureReason || t("checkout.failedDescription")}</p>
      <p className="font-mono text-xs text-muted-foreground">{transaction.orderId}</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button onClick={onRetry}>{t("checkout.tryAgain")}</Button>
        <Link href="/account/transactions" className={buttonVariants({ variant: "outline" })}>
          {t("checkout.viewHistory")}
        </Link>
      </div>
    </div>
  );
}
