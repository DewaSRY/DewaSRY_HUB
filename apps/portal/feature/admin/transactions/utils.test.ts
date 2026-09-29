import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  dateRangeToInstants,
  isInvertedRange,
  isIsoDate,
  sortKey,
  toggleStatus,
  zonedDayStart,
} from "./utils";

const ORDER = ["PENDING", "PAID", "FAILED", "REFUNDED"] as const;

describe("isIsoDate", () => {
  it("accepts real days only", () => {
    expect(isIsoDate("2026-10-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-1-2")).toBe(false);
    expect(isIsoDate("")).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});

describe("zonedDayStart", () => {
  it("returns local midnight as a UTC instant", () => {
    expect(zonedDayStart("2026-10-28", "Asia/Jakarta")).toBe("2026-10-27T17:00:00.000Z");
    expect(zonedDayStart("2026-10-28", "UTC")).toBe("2026-10-28T00:00:00.000Z");
    expect(zonedDayStart("2026-10-31", "Asia/Jakarta", 1)).toBe("2026-10-31T17:00:00.000Z");
  });
  it("handles a DST day", () => {
    // Europe/Berlin moves to CEST (UTC+2) on 2026-03-29 at 02:00 local.
    expect(zonedDayStart("2026-03-29", "Europe/Berlin")).toBe("2026-03-28T23:00:00.000Z");
    expect(zonedDayStart("2026-03-30", "Europe/Berlin")).toBe("2026-03-29T22:00:00.000Z");
  });
});

describe("dateRangeToInstants", () => {
  it("makes `to` exclusive (start of the next day)", () => {
    expect(dateRangeToInstants("2026-10-01", "2026-10-31", "Asia/Jakarta")).toEqual({
      from: "2026-09-30T17:00:00.000Z",
      to: "2026-10-31T17:00:00.000Z",
    });
  });
  it("drops missing or invalid days", () => {
    expect(dateRangeToInstants(null, "nope")).toEqual({ from: undefined, to: undefined });
  });
});

describe("isInvertedRange", () => {
  it("is true only when both days are set and from > to", () => {
    expect(isInvertedRange("2026-10-02", "2026-10-01")).toBe(true);
    expect(isInvertedRange("2026-10-01", "2026-10-01")).toBe(false);
    expect(isInvertedRange("2026-10-02", null)).toBe(false);
  });
});

describe("toggleStatus", () => {
  it("adds and removes, keeping the canonical order", () => {
    expect(toggleStatus([], "FAILED", ORDER)).toEqual(["FAILED"]);
    expect(toggleStatus(["FAILED"], "PENDING", ORDER)).toEqual(["PENDING", "FAILED"]);
    expect(toggleStatus(["PENDING", "FAILED"], "PENDING", ORDER)).toEqual(["FAILED"]);
  });
});

describe("sortKey", () => {
  it("maps sort params to i18n suffixes", () => {
    expect(sortKey("createdAt,desc")).toBe("createdAtDesc");
    expect(sortKey("amount,asc")).toBe("amountAsc");
  });
});

describe("activeFilterCount", () => {
  it("counts only set filters", () => {
    expect(activeFilterCount({})).toBe(0);
    expect(activeFilterCount({ q: "", status: [], needsReview: false })).toBe(0);
    expect(activeFilterCount({ q: "DSH", userId: "u1", status: ["PAID"], from: "2026-10-01", needsReview: true })).toBe(5);
  });
});
