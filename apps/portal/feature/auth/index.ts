/**
 * `feature/auth` barrel — client-safe exports only. Firebase session wiring,
 * the session store, the guard, and the sign-in / sign-out screens.
 */
export type * from "./type";
export { authKeys, meQuery } from "./queries";
export { useMe } from "./hooks";
export { useSession, useSessionStore } from "./session-store";
export {
  isFirebaseConfigured,
  retrySession,
  signInWithGoogle,
  signOut,
  startSession,
  waitForSession,
  type SignInResult,
} from "./session";
export { DEFAULT_AFTER_SIGN_IN, GOOGLE_ACCOUNT_URL, initials, loginHref, safeNextPath } from "./utils";
export { AuthGate } from "./components/auth-gate";
export { AuthBackdrop } from "./components/auth-backdrop";
export { GoogleIcon } from "./components/google-icon";
export { LoginScreen } from "./components/login-screen";
export { LogoutScreen } from "./components/logout-screen";
export { UserMenu } from "./components/user-menu";
