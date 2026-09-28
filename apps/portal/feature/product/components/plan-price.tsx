import { formatMoney } from "@/lib/number";
import type { Plan } from "../type";
import { isFreePlan } from "../utils";

export function PlanPrice({
  plan,
  labels,
  size = "default",
}: {
  plan: Pick<Plan, "price" | "billingPeriod">;
  labels: { free: string; perMonth: string; perYear: string };
  size?: "default" | "lg";
}) {
  const free = isFreePlan(plan);
  return (
    <p className="flex items-baseline gap-1">
      <span className={size === "lg" ? "text-4xl font-bold tracking-tight" : "text-2xl font-bold tracking-tight"}>
        {free ? labels.free : formatMoney(plan.price)}
      </span>
      {!free && plan.billingPeriod ? (
        <span className="text-sm text-muted-foreground">
          {plan.billingPeriod === "YEARLY" ? labels.perYear : labels.perMonth}
        </span>
      ) : null}
    </p>
  );
}
