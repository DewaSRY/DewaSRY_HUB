import { describe, expect, it } from "vitest";
import { planSchema, productSchema, redirectUriSchema } from "./schema";

const product = { code: "document-doctor", name: "Document Doctor", description: "", websiteUrl: "", active: true };
const plan = { code: "dd-pro", name: "Pro", price: "49000", billingPeriod: "MONTHLY" as const, features: "", public: true, active: true };

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("productSchema", () => {
  it("accepts a minimal product", () => {
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(productSchema.safeParse({ ...product, websiteUrl: "https://dd.example.com" }).success).toBe(true);
  });
  it("rejects bad input with i18n keys", () => {
    expect(firstMessage(productSchema.safeParse({ ...product, code: "Document Doctor" }))).toBe("products.errors.codeFormat");
    expect(firstMessage(productSchema.safeParse({ ...product, name: " " }))).toBe("products.errors.nameRequired");
    expect(firstMessage(productSchema.safeParse({ ...product, websiteUrl: "ftp://x.y" }))).toBe("products.errors.websiteUrl");
  });
});

describe("planSchema", () => {
  it("accepts paid and free plans", () => {
    expect(planSchema.safeParse(plan).success).toBe(true);
    expect(planSchema.safeParse({ ...plan, price: "0", billingPeriod: "" }).success).toBe(true);
  });
  it("checks price, period, and features", () => {
    expect(firstMessage(planSchema.safeParse({ ...plan, price: "49.000" }))).toBe("products.errors.priceFormat");
    expect(firstMessage(planSchema.safeParse({ ...plan, billingPeriod: "" }))).toBe("products.errors.periodRequired");
    expect(firstMessage(planSchema.safeParse({ ...plan, price: "0" }))).toBe("products.errors.periodFree");
    expect(firstMessage(planSchema.safeParse({ ...plan, features: "[]" }))).toBe("products.errors.featuresJson");
    const big = JSON.stringify({ text: "x".repeat(9000) });
    expect(firstMessage(planSchema.safeParse({ ...plan, features: big }))).toBe("products.errors.featuresTooLarge");
  });
});

describe("redirectUriSchema", () => {
  it("maps each rule to its key", () => {
    expect(redirectUriSchema.safeParse({ uri: "https://dd.example.com/cb" }).success).toBe(true);
    expect(firstMessage(redirectUriSchema.safeParse({ uri: "" }))).toBe("products.errors.uriRequired");
    expect(firstMessage(redirectUriSchema.safeParse({ uri: "http://dd.example.com/cb" }))).toBe("products.errors.uri.https");
  });
});
