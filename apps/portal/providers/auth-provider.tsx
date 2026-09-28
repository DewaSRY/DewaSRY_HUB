"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { startSession, useSessionStore } from "@/feature/auth";

/**
 * Starts the Firebase listener (ADR-008 §7.2) and clears server state when
 * the user signs out. Mounted by the `(auth)`, `sso`, `(portal)`, and
 * `(admin)` layouts only, so public `(site)` pages never download the
 * Firebase SDK.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const status = useSessionStore((state) => state.status);
  const previous = useRef(status);

  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    if (previous.current === "signed-in" && status === "signed-out") queryClient.clear();
    previous.current = status;
  }, [status, queryClient]);

  return <>{children}</>;
}
