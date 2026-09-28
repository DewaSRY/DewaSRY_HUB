"use client";

import { useEffect, type ReactNode } from "react";
import { ShieldX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import ErrorState from "@/components/ui/error-state";
import { useSession } from "../session-store";
import { retrySession } from "../session";
import type { Role } from "../type";
import { loginHref } from "../utils";

/**
 * Client-side guard for `(portal)` and `(admin)` (ADR-008 §7.2). It is for
 * user experience only — the API checks every request (`401`/`403`).
 *
 * | loading                        | `fallback` (shell skeleton)       |
 * | signed-out                     | redirect to /login?next=<path>    |
 * | signed-in, role not allowed    | 403 state, no admin data fetched  |
 * | signed-in, role allowed        | children                          |
 */
export function AuthGate({
  role,
  fallback,
  children,
}: {
  role?: Role;
  fallback: ReactNode;
  children: ReactNode;
}) {
  const { t } = useTranslation("auth");
  const { status, me, sessionError } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "signed-out") return;
    const search = typeof window === "undefined" ? "" : window.location.search;
    router.replace(loginHref(pathname, search));
  }, [status, pathname, router]);

  if (status === "loading" || status === "signed-out") return <>{fallback}</>;

  if (!me) {
    // Signed in to Firebase but the hub did not answer POST /me/session.
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
        <ErrorState
          title={t("sessionErrorTitle")}
          description={t("sessionErrorDescription")}
          onRetry={() => void retrySession()}
        >
          {sessionError?.traceId ? (
            <p className="w-full text-xs text-muted-foreground">
              {t("traceId", { ns: "common" })}: <code>{sessionError.traceId}</code>
            </p>
          ) : null}
        </ErrorState>
      </div>
    );
  }

  if (role && me.role !== role) {
    return (
      <div className="flex min-h-[60vh] flex-1 items-center justify-center p-6">
        <ErrorState icon={ShieldX} title={t("forbiddenTitle")} description={t("forbiddenDescription")}>
          <Link href="/account" className={buttonVariants({ variant: "outline" })}>
            {t("goToAccount")}
          </Link>
        </ErrorState>
      </div>
    );
  }

  return <>{children}</>;
}
