import { ArrowRight, Check, Minus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Plan, Product } from "../type";
import { checkoutHref, featureEntries, humanizeFeatureKey, isFreePlan } from "../utils";
import { PlanPrice } from "./plan-price";

export interface PlanCardLabels {
  free: string;
  perMonth: string;
  perYear: string;
  oneTime: string;
  buy: string;
  useFree: string;
  popular: string;
  featureLabel: (key: string) => string;
}

/** One plan with its price, features, and the buy button (UC-02 step 3, UC-08). */
export function PlanCard({
  product,
  plan,
  labels,
  highlighted,
}: {
  product: Pick<Product, "code" | "websiteUrl">;
  plan: Plan;
  labels: PlanCardLabels;
  highlighted?: boolean;
}) {
  const free = isFreePlan(plan);
  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-xs",
        highlighted && "border-primary/50 shadow-md ring-1 ring-primary/30",
      )}
    >
      {highlighted ? (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          {labels.popular}
        </span>
      ) : null}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        <PlanPrice plan={plan} labels={labels} />
        {!free ? <p className="text-xs text-muted-foreground">{labels.oneTime}</p> : null}
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {featureEntries(plan.features).map(({ key, value }) => (
          <li key={key} className="flex items-start gap-2">
            {value === false ? (
              <Minus className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            ) : (
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            )}
            <span className={value === false ? "text-muted-foreground line-through" : undefined}>
              {labels.featureLabel(key) || humanizeFeatureKey(key)}
              {typeof value === "number" || typeof value === "string" ? `: ${value}` : ""}
            </span>
          </li>
        ))}
      </ul>
      {free ? (
        product.websiteUrl ? (
          <a
            href={product.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", className: "w-full" })}
          >
            {labels.useFree}
          </a>
        ) : null
      ) : (
        <Link
          href={checkoutHref(plan.code, product.code)}
          className={buttonVariants({ variant: highlighted ? "default" : "outline", className: "w-full" })}
        >
          {labels.buy}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}
