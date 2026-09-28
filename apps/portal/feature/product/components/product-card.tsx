import { ArrowRight, ExternalLink, Package } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import type { Product } from "../type";
import { isFreePlan, sortPlans } from "../utils";
import { PlanPrice } from "./plan-price";

/** Product summary with "Learn more" and "Get started" (UC-02). */
export function ProductCard({
  product,
  labels,
}: {
  product: Product;
  labels: {
    learnMore: string;
    getStarted: string;
    details: string;
    from: string;
    free: string;
    perMonth: string;
    perYear: string;
    plans: (count: number) => string;
  };
}) {
  const plans = sortPlans(product.plans);
  const cheapestPaid = plans.find((plan) => !isFreePlan(plan));
  return (
    <article className="group flex flex-col gap-5 rounded-2xl border bg-card p-6 shadow-xs transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Package className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 space-y-1">
          <h3 className="text-xl font-semibold tracking-tight">
            <Link href={`/products/${product.code}`} className="hover:underline">
              {product.name}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">{labels.plans(plans.length)}</p>
        </div>
      </div>
      {product.description ? <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p> : null}
      {cheapestPaid ? (
        <div className="space-y-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{labels.from}</p>
          <PlanPrice plan={cheapestPaid} labels={labels} />
        </div>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-2">
        <Link href={`/products/${product.code}`} className={buttonVariants({ className: "flex-1" })}>
          {labels.getStarted}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
        {product.websiteUrl ? (
          <a
            href={product.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline", className: "flex-1" })}
          >
            {labels.learnMore}
            <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>
    </article>
  );
}
