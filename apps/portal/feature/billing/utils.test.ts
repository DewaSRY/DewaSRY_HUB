import { describe, expect, it } from "vitest";
import type { Subscription } from "./type";
import {
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  daysLeft,
  entitlementRefreshUrl,
  isSnapUsable,
  pollDecision,
  pollInterval,
  subscriptionAction,
  transactionTone,
} from "./utils";

const sub = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: "s1",
  product: { code: "document-doctor", name: "Document Doctor" },
  plan: { id: "p1", code: "dd-pro-monthly", name: "Pro", billingPeriod: "MONTHLY", price: { amount: 49000, currency: "IDR" }, active: true },
  status: "ACTIVE",
  startDate: "2026-10-28T03:20:00Z",
  endDate: "2026-11-28T03:20:00Z",
  entitled: true,
  ...overrides,
});

describe("polling", () => {
  it("polls every 3 s while pending, for up to 2 min", () => {
    expect(POLL_INTERVAL_MS).toBe(3000);
    expect(pollDecision("PENDING", 0, 1000)).toBe("poll");
    expect(pollDecision(undefined, 0, 1000)).toBe("poll");
    expect(pollDecision("PENDING", 0, POLL_TIMEOUT_MS)).toBe("timeout");
    expect(pollDecision("PAID", 0, 10)).toBe("done");
    expect(pollInterval("PENDING", 0, 1000)).toBe(3000);
    expect(pollInterval("FAILED", 0, 1000)).toBe(false);
    expect(pollInterval("PENDING", 0, POLL_TIMEOUT_MS + 1)).toBe(false);
  });
});

describe("subscription actions", () => {
  it("renews an active subscription on the same plan", () => {
    expect(subscriptionAction(sub())).toEqual({ kind: "renew", planCode: "dd-pro-monthly", productCode: "document-doctor" });
  });
  it("offers buy again when expired or cancelled", () => {
    expect(subscriptionAction(sub({ status: "EXPIRED", entitled: false })).kind).toBe("buy-again");
    expect(subscriptionAction(sub({ status: "CANCELLED", entitled: false })).kind).toBe("buy-again");
  });
  it("asks for another plan when the plan is no longer sold", () => {
    const inactive = sub({ plan: { ...sub().plan, active: false } });
    expect(subscriptionAction(inactive)).toEqual({ kind: "choose-plan", productCode: "document-doctor" });
  });
});

describe("helpers", () => {
  it("knows when the Snap token is usable", () => {
    const snap = { token: "t", redirectUrl: "https://x", expiresAt: "2026-10-29T03:15:00Z" };
    expect(isSnapUsable({ status: "PENDING", snap }, Date.parse("2026-10-28T00:00:00Z"))).toBe(true);
    expect(isSnapUsable({ status: "PENDING", snap }, Date.parse("2026-10-30T00:00:00Z"))).toBe(false);
    expect(isSnapUsable({ status: "PAID", snap: null })).toBe(false);
  });
  it("maps status tones", () => {
    expect(transactionTone("PAID")).toBe("success");
    expect(transactionTone("PENDING")).toBe("warning");
    expect(transactionTone("FAILED")).toBe("destructive");
    expect(transactionTone("REFUNDED")).toBe("secondary");
  });
  it("counts days left", () => {
    expect(daysLeft("2026-11-28T03:20:00Z", Date.parse("2026-11-26T03:20:00Z"))).toBe(2);
    expect(daysLeft("2026-11-28T03:20:00Z", Date.parse("2026-12-01T00:00:00Z"))).toBe(0);
  });
  it("adds entitlement=refresh", () => {
    expect(entitlementRefreshUrl("https://dd.example/app?x=1")).toBe("https://dd.example/app?x=1&entitlement=refresh");
    expect(entitlementRefreshUrl(null)).toBeNull();
  });
});
