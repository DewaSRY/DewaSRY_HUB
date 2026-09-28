import type { AuthorizeValidation } from "./type";

type ParamSource = { get(name: string): string | null };

const CLIENT_ID = /^[A-Za-z0-9_.-]{1,100}$/;
// RFC 7636: BASE64URL(SHA256(verifier)) is 43 chars; allow the full 43–128 range.
const CODE_CHALLENGE = /^[A-Za-z0-9_-]{43,128}$/;
const MAX_STATE = 512;

/**
 * `redirect_uri` must be HTTPS, or `http://localhost` / `127.0.0.1` in
 * development (ADR-001 §5.7). The API still checks it against the registered
 * URIs exactly; this only stops obviously bad links early.
 */
export function isAllowedRedirectUri(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.username || url.password || url.hash) return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
}

/** Validates the `/sso/authorize` query (OAuth 2.0 authorization code + PKCE). */
export function validateAuthorizeParams(search: ParamSource): AuthorizeValidation {
  const responseType = search.get("response_type");
  if (responseType && responseType !== "code") return { ok: false, reason: "unsupported_response_type" };

  const clientId = search.get("client_id")?.trim() ?? "";
  if (!clientId || !CLIENT_ID.test(clientId)) return { ok: false, reason: "missing_client_id" };

  const redirectUri = search.get("redirect_uri")?.trim() ?? "";
  if (!redirectUri) return { ok: false, reason: "missing_redirect_uri" };
  if (!isAllowedRedirectUri(redirectUri)) return { ok: false, reason: "invalid_redirect_uri" };

  const state = search.get("state") ?? "";
  if (!state || state.length > MAX_STATE) return { ok: false, reason: "missing_state" };

  const codeChallenge = search.get("code_challenge")?.trim() ?? "";
  if (!codeChallenge) return { ok: false, reason: "missing_code_challenge" };
  if (!CODE_CHALLENGE.test(codeChallenge)) return { ok: false, reason: "invalid_code_challenge" };

  const method = search.get("code_challenge_method") ?? "S256";
  if (method !== "S256") return { ok: false, reason: "unsupported_code_challenge_method" };

  return { ok: true, params: { clientId, redirectUri, state, codeChallenge, codeChallengeMethod: "S256" } };
}

/** `redirect_uri?code=…&state=…`, keeping any query the product registered. */
export function buildRedirect(redirectUri: string, code: string, state: string): string {
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  url.searchParams.set("state", state);
  return url.toString();
}

export function redirectHost(redirectUri: string): string {
  try {
    return new URL(redirectUri).host;
  } catch {
    return redirectUri;
  }
}
