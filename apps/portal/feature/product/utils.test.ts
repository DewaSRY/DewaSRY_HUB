import { describe, expect, it } from "vitest";
import type { Plan, Product } from "./type";
import { featureEntries, findPlanByCode, humanizeFeatureKey, isFreePlan, isPurchasable, periodKey, sortPlans } from "./utils";

const plan = (code: string, amount: number, billingPeriod: Plan["billingPeriod"]): Plan => ({
  id: code,
  code,
  name: code,
  price: { amount, currency: "IDR" },
  billingPeriod,
  features: {},
});

describe("product utils", () => {
  const products: Product[] = [
    { code: "document-doctor", name: "DD", description: null, websiteUrl: null, plans: [plan("dd-pro-monthly", 49000, "MONTHLY"), plan("dd-free", 0, null)] },
  ];

  it("detects free and purchasable plans", () => {
    expect(isFreePlan(plan("f", 0, null))).toBe(true);
    expect(isPurchasable(plan("p", 49000, "MONTHLY"))).toBe(true);
    expect(isPurchasable(plan("f", 0, null))).toBe(false);
  });

  it("sorts free first", () => {
    expect(sortPlans(products[0].plans).map((p) => p.code)).toEqual(["dd-free", "dd-pro-monthly"]);
  });

  it("finds a plan by its code", () => {
    expect(findPlanByCode(products, "dd-pro-monthly")?.product.code).toBe("document-doctor");
    expect(findPlanByCode(products, "nope")).toBeNull();
  });

  it("maps periods and features", () => {
    expect(periodKey("MONTHLY")).toBe("monthly");
    expect(periodKey(null)).toBe("free");
    expect(featureEntries({ removeAds: true })).toEqual([{ key: "removeAds", value: true }]);
    expect(humanizeFeatureKey("removeAds")).toBe("Remove ads");
    expect(humanizeFeatureKey("max_files")).toBe("Max files");
  });
});
