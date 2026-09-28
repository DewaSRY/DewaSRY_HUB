/** `POST /sso/codes` body (ADR-001 §5.7; endpoint not yet in ADR-003 §4.1). */
export interface SsoCodeInput {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

export interface SsoCode {
  code: string;
}

export interface AuthorizeParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

export type AuthorizeReason =
  | "missing_client_id"
  | "missing_redirect_uri"
  | "invalid_redirect_uri"
  | "missing_state"
  | "missing_code_challenge"
  | "invalid_code_challenge"
  | "unsupported_code_challenge_method"
  | "unsupported_response_type";

export type AuthorizeValidation = { ok: true; params: AuthorizeParams } | { ok: false; reason: AuthorizeReason };
