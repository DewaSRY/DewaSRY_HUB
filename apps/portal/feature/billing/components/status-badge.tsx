"use client";

import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { Subscription, TransactionStatus } from "../type";
import { subscriptionTone, transactionTone } from "../utils";

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  const { t } = useTranslation("billing");
  return <Badge variant={transactionTone(status)}>{t(`status.${status}`)}</Badge>;
}

export function SubscriptionStatusBadge({ subscription }: { subscription: Pick<Subscription, "status" | "entitled"> }) {
  const { t } = useTranslation("billing");
  return <Badge variant={subscriptionTone(subscription)}>{t(`subscriptionStatus.${subscription.status}`)}</Badge>;
}
