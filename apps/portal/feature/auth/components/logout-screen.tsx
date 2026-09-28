"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { signOut } from "../session";

/** `/logout` (UC-04): Firebase `signOut()` only — no API call. */
export function LogoutScreen() {
  const { t } = useTranslation("auth");
  const queryClient = useQueryClient();
  const expired = useSearchParams().get("reason") === "expired";
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void signOut().then(() => {
      queryClient.clear();
      if (!cancelled) setDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-card/90 p-8 text-center shadow-xl backdrop-blur-sm">
        {done ? (
          <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        ) : (
          <Loader2 className="mx-auto size-10 animate-spin text-muted-foreground" aria-hidden />
        )}
        <h1 className="mt-4 text-xl font-semibold">
          {done ? (expired ? t("sessionExpiredTitle") : t("signedOutTitle")) : t("signingOut")}
        </h1>
        {done ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {expired ? t("sessionExpiredDescription") : t("signedOutDescription")}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Link href="/login" className={buttonVariants()}>
                {t("signInAgain")}
              </Link>
              <Link href="/" className={buttonVariants({ variant: "outline" })}>
                {t("backHome")}
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
