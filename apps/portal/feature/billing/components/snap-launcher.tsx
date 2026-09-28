"use client";

import Script from "next/script";
import { create } from "zustand";

/**
 * Midtrans Snap (ADR-008 §8): `snap.js` is loaded with `next/script` only on
 * `/checkout`. The popup callbacks are UI hints only — access is granted by
 * the webhook (FR-P2), so every callback just starts polling.
 */

export const MIDTRANS_CLIENT_KEY = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() || "";
const SANDBOX = process.env.NEXT_PUBLIC_MIDTRANS_SANDBOX !== "false";
export const SNAP_SCRIPT_URL = SANDBOX
  ? "https://app.sandbox.midtrans.com/snap/snap.js"
  : "https://app.midtrans.com/snap/snap.js";

export interface SnapCallbacks {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}

declare global {
  interface Window {
    snap?: { pay: (token: string, options?: SnapCallbacks) => void; hide?: () => void };
  }
}

const useSnapStatus = create<{ status: "idle" | "ready" | "error" }>(() => ({ status: "idle" }));

export function useSnapReady() {
  return useSnapStatus((state) => state.status);
}

export function SnapLauncher() {
  if (!MIDTRANS_CLIENT_KEY) return null;
  return (
    <Script
      id="midtrans-snap"
      src={SNAP_SCRIPT_URL}
      data-client-key={MIDTRANS_CLIENT_KEY}
      strategy="afterInteractive"
      onReady={() => useSnapStatus.setState({ status: "ready" })}
      onError={() => useSnapStatus.setState({ status: "error" })}
    />
  );
}

/** Opens the Snap popup. Returns `false` when Snap is not available (use the redirect URL instead). */
export function openSnap(token: string, callbacks: SnapCallbacks): boolean {
  if (typeof window === "undefined" || !window.snap?.pay) return false;
  window.snap.pay(token, callbacks);
  return true;
}
