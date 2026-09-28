import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { setTokenProvider, setUnauthorizedHandler } from "@/lib/api/browser-client";
import { toApiError } from "@/lib/api/error";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { authClient } from "./client";
import { useSessionStore } from "./session-store";
import type { FirebaseProfile } from "./type";

/**
 * Firebase ↔ hub session wiring (ADR-008 §7.2, ADR-001 §5.7).
 *
 * - Installs the token provider used by `lib/api/browser-client.ts` (rule I1:
 *   `lib/` never imports `feature/`).
 * - Listens to `onAuthStateChanged`; on sign-in calls `POST /me/session` once
 *   per Firebase user and stores `{ status, profile, role }`.
 * - Started once per page load, however many layouts mount the provider.
 */

let started = false;
let sessionUid: string | null = null;
let sessionPromise: Promise<void> | null = null;

function toProfile(user: User): FirebaseProfile {
  return { uid: user.uid, email: user.email, displayName: user.displayName, photoURL: user.photoURL };
}

function currentLocale(): string {
  if (typeof window === "undefined") return "id";
  const segment = window.location.pathname.split("/")[1];
  return segment === "en" || segment === "id" ? segment : "id";
}

async function syncSession(user: User) {
  const store = useSessionStore.getState();
  try {
    const response = await authClient.createSession();
    sessionUid = user.uid;
    store.setSignedIn(toProfile(user), response.data.data);
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError?.status === 401) {
      // Token rejected by the API: show the sign-in button again (UC-04).
      sessionUid = null;
      await firebaseSignOut(getFirebaseAuth()!).catch(() => undefined);
      store.setSignedOut();
      store.setSessionError({ status: 401, message: apiError.message, traceId: apiError.traceId });
      return;
    }
    // API down or 5xx: signed in to Firebase, profile unknown. Guards show a retry.
    store.setSignedIn(toProfile(user), null);
    store.setSessionError({
      status: apiError?.status ?? 0,
      message: apiError?.message ?? "Session could not be created",
      traceId: apiError?.traceId,
    });
  }
}

/** Starts the Firebase listener. Safe to call many times. */
export function startSession(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const store = useSessionStore.getState();

  if (!isFirebaseConfigured()) {
    store.setSignedOut();
    return;
  }
  const auth = getFirebaseAuth();
  if (!auth) {
    store.setSignedOut();
    return;
  }

  setTokenProvider(async (forceRefresh) => (auth.currentUser ? auth.currentUser.getIdToken(forceRefresh) : null));
  setUnauthorizedHandler(() => {
    window.location.assign(`/${currentLocale()}/logout?reason=expired`);
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) {
      sessionUid = null;
      sessionPromise = null;
      useSessionStore.getState().setSignedOut();
      return;
    }
    if (sessionUid === user.uid && useSessionStore.getState().me) return;
    useSessionStore.getState().setLoading();
    sessionPromise = syncSession(user);
  });
}

/** Re-runs `POST /me/session` (used by the "Try again" button of an error state). */
export async function retrySession(): Promise<void> {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return;
  useSessionStore.getState().setLoading();
  sessionPromise = syncSession(user);
  await sessionPromise;
}

export type SignInResult = { ok: true } | { ok: false; reason: "cancelled" | "not-configured" | "failed"; message?: string };

/** Google sign-in popup (UC-04 step 1). The listener above does the rest. */
export async function signInWithGoogle(): Promise<SignInResult> {
  const auth = getFirebaseAuth();
  if (!auth) return { ok: false, reason: "not-configured" };
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    await signInWithPopup(auth, provider);
    return { ok: true };
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request" || code === "auth/user-cancelled") {
      return { ok: false, reason: "cancelled" };
    }
    return { ok: false, reason: "failed", message: (error as Error)?.message };
  }
}

/** Waits until the current sign-in has finished `POST /me/session`. */
export async function waitForSession(): Promise<void> {
  if (sessionPromise) await sessionPromise;
}

/** Firebase `signOut()` — no API call; the backend keeps no session (UC-04). */
export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  sessionUid = null;
  sessionPromise = null;
  if (auth) await firebaseSignOut(auth).catch(() => undefined);
  useSessionStore.getState().setSignedOut();
}

export { isFirebaseConfigured };
