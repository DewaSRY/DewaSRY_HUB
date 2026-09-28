export type Role = "USER" | "ADMIN";

export interface MeProduct {
  code: string;
  name: string;
  joinedAt: string;
}

/** `Me` (ADR-003 §6.1) — the profile follows the Google account and is read-only. */
export interface Me {
  id: string;
  firebaseUid: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: Role;
  products: MeProduct[];
  createdAt: string;
  lastSignInAt: string | null;
}

export type SessionStatus = "loading" | "signed-in" | "signed-out";

export interface FirebaseProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}
