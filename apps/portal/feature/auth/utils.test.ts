import { describe, expect, it } from "vitest";
import { defaultAfterSignIn, initials, loginHref, safeNextPath } from "./utils";

describe("safeNextPath", () => {
  it.each([
    ["/checkout/dd-pro-monthly", "/checkout/dd-pro-monthly"],
    ["/checkout/dd-pro-monthly?product=document-doctor", "/checkout/dd-pro-monthly?product=document-doctor"],
    ["/en/account/subscriptions", "/account/subscriptions"],
    ["/id", "/"],
    ["%2Faccount%2Ftransactions", "/account/transactions"],
    ["/admin/articles#top", "/admin/articles#top"],
  ])("accepts %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example/account",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "account",
    "/login",
    "/en/logout",
    "%2F%2Fevil.example",
    "",
    null,
    undefined,
  ])("rejects %s", (input) => {
    expect(safeNextPath(input as string)).toBe("/account");
  });

  it("sends admins to /admin when there is no next", () => {
    expect(safeNextPath(null, defaultAfterSignIn("ADMIN"))).toBe("/admin");
    expect(safeNextPath(null, defaultAfterSignIn("USER"))).toBe("/account");
    expect(safeNextPath("/checkout/x", defaultAfterSignIn("ADMIN"))).toBe("/checkout/x");
  });

  it("builds login links", () => {
    expect(loginHref("/checkout/x", "?product=y")).toBe("/login?next=%2Fcheckout%2Fx%3Fproduct%3Dy");
    expect(loginHref("//evil")).toBe("/login");
  });

  it("builds initials", () => {
    expect(initials("Putu Ayu")).toBe("PA");
    expect(initials(null, "dewa@example.com")).toBe("DE");
  });
});
