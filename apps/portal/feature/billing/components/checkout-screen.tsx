"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CreditCard, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InlineAlert } from "@/components/common/inline-alert";
import { QueryErrorState } from "@/components/common/query-error-state";
import { toApiError, type ApiError } from "@/lib/api/error";
import { randomId } from "@/lib/utils";
import { findPlanByCode, isPurchasable, useProduct, useProducts, type Plan } from "@/feature/product";
import { useCheckout, useTransaction } from "../hooks";
import { useCheckoutStore } from "./store";
import { CheckoutSummary } from "./checkout-summary";
import { PaymentFailed, PaymentProcessing, PaymentSuccess, PendingInstructions } from "./payment-status";
import { MIDTRANS_CLIENT_KEY, SnapLauncher, openSnap, useSnapReady } from "./snap-launcher";
import { pollDecision } from "../utils";

/** Resolves the plan from `?product=` (one call) or, without it, from the product list. */
function usePlan(planCode: string, productCode: string | null) {
  const single = useProduct(productCode);
  const singleMatch = useMemo(
    () => (single.data ? findPlanByCode([single.data], planCode) : null),
    [single.data, planCode],
  );
  // The list is only needed without `?product=`, or when it pointed at the wrong product.
  const needList = !productCode || single.isError || (single.isSuccess && !singleMatch);
  const all = useProducts({ enabled: needList });
  const listMatch = useMemo(() => (all.data ? findPlanByCode(all.data, planCode) : null), [all.data, planCode]);
  const match = singleMatch ?? listMatch;
  return {
    match,
    isPending: (Boolean(productCode) && single.isPending) || (needList && all.isPending),
    error: needList ? all.error : single.error,
    refetch: needList ? all.refetch : single.refetch,
  };
}

function checkoutErrorMessage(error: ApiError, t: (key: string, options?: Record<string, unknown>) => string): { title: string; body?: string } {
  switch (error.status) {
    case 0:
      return { title: t("checkout.errors.network") };
    case 404:
      return { title: t("checkout.errors.notFound") };
    case 409:
      // PLAN_NOT_PURCHASABLE or PLAN_CHANGE_NOT_SUPPORTED — the API message says which (ADR-003 §14.2).
      return { title: t("checkout.errors.conflict"), body: error.message };
    case 502:
      return { title: t("checkout.errors.upstream"), body: error.message };
    default:
      return { title: t("checkout.errors.generic"), body: error.body?.message };
  }
}

/**
 * `/checkout/[planCode]` (UC-08, UC-12): summary → `POST /checkout` with an
 * Idempotency-Key → Snap popup → poll the transaction every 3 s for up to
 * 2 minutes → success, failure, or pending instructions. The Snap callback
 * never grants access; only the polled status (set by the webhook) does.
 */
export function CheckoutScreen({ planCode }: { planCode: string }) {
  const { t } = useTranslation("billing");
  const searchParams = useSearchParams();
  const productCode = searchParams.get("product");
  const isRenewal = searchParams.get("renew") === "1";
  const plan = usePlan(planCode, productCode);
  const checkout = useCheckout();
  const snapStatus = useSnapReady();
  const { step, orderId, pollSince, idempotencyKey, setIdempotencyKey, startPaying, startPolling, setStep, reset } =
    useCheckoutStore();
  const transaction = useTransaction(orderId, { pollSince: step === "processing" ? pollSince : null });
  const [startError, setStartError] = useState<ApiError | null>(null);

  // Fresh wizard for every visit.
  useEffect(() => {
    reset();
    return () => reset();
  }, [reset, planCode]);

  // Poll outcome → next step.
  const status = transaction.data?.status;
  useEffect(() => {
    if (step !== "processing" || !pollSince) return;
    const decision = pollDecision(status, pollSince, Date.now());
    if (decision === "done") setStep(status === "PAID" ? "success" : status === "PENDING" ? "pending" : "failed");
    else if (decision === "timeout") setStep("pending");
  }, [step, status, pollSince, setStep, transaction.dataUpdatedAt]);

  // Stop polling after 2 minutes even when no new data arrives.
  useEffect(() => {
    if (step !== "processing" || !pollSince) return;
    const timer = setTimeout(() => setStep("pending"), Math.max(0, pollSince + 120_000 - Date.now()));
    return () => clearTimeout(timer);
  }, [step, pollSince, setStep]);

  const launchSnap = useCallback(
    (token: string, redirectUrl?: string) => {
      const opened = openSnap(token, {
        onSuccess: () => startPolling("success"),
        onPending: () => startPolling("pending"),
        onError: () => startPolling("error"),
        onClose: () => startPolling("closed"),
      });
      if (!opened) {
        // Snap unavailable (no client key or blocked script): open the hosted page and poll.
        if (redirectUrl) window.open(redirectUrl, "_blank", "noopener,noreferrer");
        startPolling("pending");
      }
    },
    [startPolling],
  );

  async function handlePay(selected: Plan) {
    setStartError(null);
    const key = idempotencyKey ?? randomId();
    setIdempotencyKey(key);
    try {
      const created = await checkout.mutateAsync({ planId: selected.id, idempotencyKey: key });
      startPaying(created.orderId);
      if (created.status !== "PENDING") {
        setStep(created.status === "PAID" ? "success" : "failed");
        return;
      }
      if (created.snap) launchSnap(created.snap.token, created.snap.redirectUrl);
      else startPolling("pending");
    } catch (error) {
      setStartError(toApiError(error));
      // A new click is a new purchase attempt (ADR-003 §3.8).
      setIdempotencyKey(null);
    }
  }

  if (plan.isPending) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-4 py-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (plan.error && !plan.match) {
    return <QueryErrorState error={plan.error} onRetry={() => plan.refetch()} className="mx-auto max-w-xl" />;
  }
  if (!plan.match) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardContent className="space-y-4 py-6 text-center">
          <h1 className="text-xl font-semibold">{t("checkout.planUnavailableTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("checkout.planUnavailableDescription")}</p>
          <Link href={productCode ? `/products/${productCode}` : "/products"} className={buttonVariants()}>
            {t("checkout.choosePlan")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { product, plan: selected } = plan.match;
  const purchasable = isPurchasable(selected);
  const tx = transaction.data;
  const startMessage = startError ? checkoutErrorMessage(startError, t) : null;

  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_18rem]">
      <SnapLauncher />
      <Card>
        <CardHeader className="border-b">
          <Link href={`/products/${product.code}`} className="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden />
            {product.name}
          </Link>
          <CardTitle className="text-2xl">{isRenewal ? t("checkout.renewTitle") : t("checkout.title")}</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          {step === "summary" || step === "paying" ? (
            <div className="space-y-5">
              <CheckoutSummary product={product} plan={selected} />
              {!purchasable ? <InlineAlert variant="info" title={t("checkout.freePlan")} /> : null}
              {startMessage ? (
                <InlineAlert title={startMessage.title}>
                  {startMessage.body ? <p>{startMessage.body}</p> : null}
                  {startError?.traceId ? (
                    <p className="text-xs">
                      {t("traceId", { ns: "common" })}: <code>{startError.traceId}</code>
                    </p>
                  ) : null}
                </InlineAlert>
              ) : null}
              {!MIDTRANS_CLIENT_KEY ? <InlineAlert variant="warning" title={t("checkout.snapNotConfigured")} /> : null}
            </div>
          ) : step === "processing" ? (
            <PaymentProcessing />
          ) : step === "pending" && tx ? (
            <PendingInstructions
              transaction={tx}
              onReopen={tx.snap ? () => launchSnap(tx.snap!.token, tx.snap!.redirectUrl) : undefined}
              onCheckAgain={() => startPolling(null)}
              checking={transaction.isFetching}
            />
          ) : step === "success" && tx ? (
            <PaymentSuccess transaction={tx} productWebsite={product.websiteUrl} />
          ) : step === "failed" && tx ? (
            <PaymentFailed transaction={tx} onRetry={() => reset()} />
          ) : (
            <PaymentProcessing />
          )}
        </CardContent>
        {step === "summary" || step === "paying" ? (
          <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden />
              {t("checkout.securedBy")}
            </p>
            <Button
              size="lg"
              onClick={() => void handlePay(selected)}
              loading={checkout.isPending || step === "paying"}
              disabled={!purchasable || (Boolean(MIDTRANS_CLIENT_KEY) && snapStatus === "idle")}
            >
              <CreditCard aria-hidden />
              {t("checkout.pay")}
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <aside className="space-y-3 text-sm text-muted-foreground">
        <div className="rounded-xl border bg-card p-4">
          <p className="font-medium text-foreground">{t("checkout.howItWorksTitle")}</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4">
            <li>{t("checkout.howItWorks.one")}</li>
            <li>{t("checkout.howItWorks.two")}</li>
            <li>{t("checkout.howItWorks.three")}</li>
          </ol>
        </div>
        {orderId ? (
          <p className="px-1 text-xs">
            {t("checkout.orderId")}: <code className="font-mono">{orderId}</code>
          </p>
        ) : null}
      </aside>
    </div>
  );
}
