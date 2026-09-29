import { describe, expect, it } from "vitest";
import type { AdminPlan, AdminProduct } from "./type";
import {
  canCreateCredential,
  canRevokeCredential,
  formatFeatures,
  hasActiveFreePlan,
  parseFeatures,
  planPatchBody,
  planToForm,
  productPatchBody,
  productToForm,
  redirectUriProblem,
  toPlanInput,
} from "./utils";

const plan: AdminPlan = {
  id: "p1",
  code: "dd-pro-monthly",
  name: "Pro",
  price: { amount: 49000, currency: "IDR" },
  billingPeriod: "MONTHLY",
  features: { removeAds: true },
  public: true,
  active: true,
  sold: false,
  activeSubscriptions: 0,
  createdAt: "2026-10-01T00:00:00Z",
};

const product: AdminProduct = {
  id: "x1",
  code: "document-doctor",
  name: "Document Doctor",
  description: null,
  websiteUrl: "https://dd.example.com",
  active: true,
  planCount: 1,
  plans: [plan],
  credentials: [{ clientId: "c1", createdAt: "2026-10-01T00:00:00Z", lastUsedAt: null }],
  redirectUris: [],
  memberCount: 0,
  createdAt: "2026-10-01T00:00:00Z",
};

describe("parseFeatures / formatFeatures", () => {
  it("accepts objects and empty text only", () => {
    expect(parseFeatures("")).toEqual({ ok: true, value: {} });
    expect(parseFeatures('{"removeAds": true}')).toEqual({ ok: true, value: { removeAds: true } });
    expect(parseFeatures("[1]").ok).toBe(false);
    expect(parseFeatures("null").ok).toBe(false);
    expect(parseFeatures("{oops").ok).toBe(false);
  });
  it("round-trips", () => {
    expect(formatFeatures({})).toBe("");
    expect(parseFeatures(formatFeatures(plan.features))).toEqual({ ok: true, value: plan.features });
  });
});

describe("toPlanInput", () => {
  it("builds a paid plan", () => {
    expect(toPlanInput(planToForm(plan))).toEqual({
      code: "dd-pro-monthly",
      name: "Pro",
      price: { amount: 49000, currency: "IDR" },
      billingPeriod: "MONTHLY",
      features: { removeAds: true },
      public: true,
      active: true,
    });
  });
  it("forces a null period for a free plan", () => {
    const input = toPlanInput({ ...planToForm(null), code: "dd-free", name: "Free", price: "0", billingPeriod: "MONTHLY" });
    expect(input.price.amount).toBe(0);
    expect(input.billingPeriod).toBeNull();
    expect(input.features).toEqual({});
  });
});

describe("planPatchBody", () => {
  it("returns null when nothing changed", () => {
    expect(planPatchBody(plan, planToForm(plan))).toBeNull();
  });
  it("sends only changed fields", () => {
    expect(planPatchBody(plan, { ...planToForm(plan), name: " Pro+ ", price: "59000", active: false })).toEqual({
      name: "Pro+",
      active: false,
      price: { amount: 59000, currency: "IDR" },
    });
  });
  it("never sends price or period once sold", () => {
    const sold = { ...plan, sold: true };
    expect(planPatchBody(sold, { ...planToForm(sold), price: "1", billingPeriod: "YEARLY" })).toBeNull();
  });
});

describe("productPatchBody", () => {
  it("returns null when nothing changed", () => {
    expect(productPatchBody(product, productToForm(product))).toBeNull();
  });
  it("clears empty text fields with null", () => {
    expect(productPatchBody(product, { ...productToForm(product), websiteUrl: " ", description: "Docs" })).toEqual({
      websiteUrl: null,
      description: "Docs",
    });
  });
});

describe("redirectUriProblem", () => {
  it("follows ADR-001 §5.7", () => {
    expect(redirectUriProblem("https://dd.example.com/sso/callback")).toBeNull();
    expect(redirectUriProblem("http://localhost:3000/cb")).toBeNull();
    expect(redirectUriProblem("http://127.0.0.1/cb")).toBeNull();
    expect(redirectUriProblem("/sso/callback")).toBe("absolute");
    expect(redirectUriProblem("mailto:a@b.c")).toBe("absolute");
    expect(redirectUriProblem("https://dd.example.com/cb#x")).toBe("fragment");
    expect(redirectUriProblem("https://*.example.com/cb")).toBe("fragment");
    expect(redirectUriProblem("http://dd.example.com/cb")).toBe("https");
  });
});

describe("credential and plan rules", () => {
  it("allows at most two credentials and never revokes the last one", () => {
    expect(canCreateCredential(product)).toBe(true);
    expect(canRevokeCredential(product)).toBe(false);
    const two = { credentials: [...product.credentials, { clientId: "c2", createdAt: "", lastUsedAt: null }] };
    expect(canCreateCredential(two)).toBe(false);
    expect(canRevokeCredential(two)).toBe(true);
  });
  it("finds another active free plan", () => {
    const free = { ...plan, id: "f1", price: { amount: 0, currency: "IDR" }, billingPeriod: null };
    expect(hasActiveFreePlan([plan])).toBe(false);
    expect(hasActiveFreePlan([plan, free])).toBe(true);
    expect(hasActiveFreePlan([plan, free], "f1")).toBe(false);
    expect(hasActiveFreePlan([plan, { ...free, active: false }])).toBe(false);
  });
});
