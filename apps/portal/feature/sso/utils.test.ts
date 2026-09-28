import { describe, expect, it } from "vitest";
import { buildRedirect, isAllowedRedirectUri, validateAuthorizeParams } from "./utils";

const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const valid = {
  client_id: "dd_live_4F7K2M9Q",
  redirect_uri: "https://documentdoctor.example.com/auth/callback",
  state: "xyz",
  code_challenge: challenge,
  code_challenge_method: "S256",
};
const params = (overrides: Record<string, string | null> = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...valid, ...overrides })) if (value !== null) search.set(key, value);
  return search;
};

describe("validateAuthorizeParams", () => {
  it("accepts a valid request", () => {
    expect(validateAuthorizeParams(params())).toEqual({
      ok: true,
      params: {
        clientId: "dd_live_4F7K2M9Q",
        redirectUri: valid.redirect_uri,
        state: "xyz",
        codeChallenge: challenge,
        codeChallengeMethod: "S256",
      },
    });
  });

  it("defaults the method to S256", () => {
    expect(validateAuthorizeParams(params({ code_challenge_method: null })).ok).toBe(true);
  });

  it.each([
    [{ client_id: null }, "missing_client_id"],
    [{ redirect_uri: null }, "missing_redirect_uri"],
    [{ redirect_uri: "http://evil.example/cb" }, "invalid_redirect_uri"],
    [{ redirect_uri: "javascript:alert(1)" }, "invalid_redirect_uri"],
    [{ redirect_uri: "https://user:pass@x.example/cb" }, "invalid_redirect_uri"],
    [{ state: null }, "missing_state"],
    [{ code_challenge: null }, "missing_code_challenge"],
    [{ code_challenge: "short" }, "invalid_code_challenge"],
    [{ code_challenge_method: "plain" }, "unsupported_code_challenge_method"],
    [{ response_type: "token" }, "unsupported_response_type"],
  ])("rejects %o with %s", (overrides, reason) => {
    expect(validateAuthorizeParams(params(overrides as Record<string, string | null>))).toEqual({ ok: false, reason });
  });

  it("allows localhost over http for development", () => {
    expect(isAllowedRedirectUri("http://localhost:5173/cb")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:5173/cb")).toBe(true);
  });

  it("builds the redirect with code and state", () => {
    expect(buildRedirect("https://app.example/cb?x=1", "abc", "s t")).toBe("https://app.example/cb?x=1&code=abc&state=s+t");
  });
});
