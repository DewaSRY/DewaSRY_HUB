import { create } from "zustand";

/**
 * Checkout wizard state (ADR-008 §8): the step and the order being paid only.
 * Server data (the transaction itself) stays in TanStack Query.
 */
export type CheckoutStep = "summary" | "paying" | "processing" | "pending" | "success" | "failed";

interface CheckoutState {
  step: CheckoutStep;
  orderId: string | null;
  /** When polling started (ms), for the 2-minute cap. */
  pollSince: number | null;
  /** The Idempotency-Key of the in-flight "Buy" click. */
  idempotencyKey: string | null;
  snapResult: "success" | "pending" | "error" | "closed" | null;
  setIdempotencyKey: (key: string | null) => void;
  startPaying: (orderId: string) => void;
  startPolling: (result: CheckoutState["snapResult"]) => void;
  setStep: (step: CheckoutStep) => void;
  reset: () => void;
}

const INITIAL = {
  step: "summary" as CheckoutStep,
  orderId: null,
  pollSince: null,
  idempotencyKey: null,
  snapResult: null,
};

export const useCheckoutStore = create<CheckoutState>((set) => ({
  ...INITIAL,
  setIdempotencyKey: (idempotencyKey) => set({ idempotencyKey }),
  startPaying: (orderId) => set({ step: "paying", orderId }),
  startPolling: (snapResult) => set({ step: "processing", pollSince: Date.now(), snapResult }),
  setStep: (step) => set({ step }),
  reset: () => set(INITIAL),
}));
