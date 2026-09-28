import { create } from "zustand";
import type { FirebaseProfile, Me, Role, SessionStatus } from "./type";

/**
 * Session state (ADR-008 §8): status, profile, and role only. The ID token is
 * never copied into state — `lib/api/browser-client.ts` asks Firebase for it
 * on every request.
 */
interface SessionState {
  status: SessionStatus;
  firebaseUser: FirebaseProfile | null;
  me: Me | null;
  role: Role | null;
  /** Set when `POST /me/session` failed; the user is signed in to Firebase but the hub rejected them. */
  sessionError: { status: number; message: string; traceId?: string } | null;
  setLoading: () => void;
  setSignedIn: (firebaseUser: FirebaseProfile, me: Me | null) => void;
  setMe: (me: Me) => void;
  setSessionError: (error: SessionState["sessionError"]) => void;
  setSignedOut: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: "loading",
  firebaseUser: null,
  me: null,
  role: null,
  sessionError: null,
  setLoading: () => set({ status: "loading" }),
  setSignedIn: (firebaseUser, me) =>
    set({ status: "signed-in", firebaseUser, me, role: me?.role ?? null, sessionError: null }),
  setMe: (me) => set({ me, role: me.role }),
  setSessionError: (sessionError) => set({ sessionError }),
  setSignedOut: () =>
    set({ status: "signed-out", firebaseUser: null, me: null, role: null, sessionError: null }),
}));

export function useSession() {
  const status = useSessionStore((state) => state.status);
  const me = useSessionStore((state) => state.me);
  const role = useSessionStore((state) => state.role);
  const firebaseUser = useSessionStore((state) => state.firebaseUser);
  const sessionError = useSessionStore((state) => state.sessionError);
  return { status, me, role, firebaseUser, sessionError, isAdmin: role === "ADMIN" };
}
