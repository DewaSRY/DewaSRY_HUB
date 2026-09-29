"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/common/inline-alert";
import { useSession } from "../session-store";
import { isFirebaseConfigured, signInWithGoogle } from "../session";
import { defaultAfterSignIn, safeNextPath } from "../utils";
import { GoogleIcon } from "./google-icon";

/**
 * `/login` (UC-04): Google only; the first sign-in creates the account. After
 * sign-in the user goes to `?next=` (same-site only), else `/admin` for an
 * admin or `/account` for everyone else.
 */
export function LoginScreen() {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const { status, me, sessionError } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (status === "signed-in" && me) router.replace(safeNextPath(nextParam, defaultAfterSignIn(me.role)));
  }, [status, me, nextParam, router]);

  async function handleSignIn() {
    setError(null);
    setPending(true);
    const result = await signInWithGoogle();
    setPending(false);
    if (!result.ok) {
      if (result.reason === "cancelled") return; // UC-04: stay on the page, nothing created.
      setError(result.reason === "not-configured" ? t("notConfigured") : t("signInFailed"));
    }
  }

  const busy = pending || (status === "loading" && configured) || (status === "signed-in" && !!me);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-card/90 p-6 shadow-xl ring-1 ring-foreground/5 backdrop-blur-sm sm:p-8">
        <div className="mb-6 space-y-2 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{t("loginTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("loginDescription")}</p>
        </div>

        {!configured ? (
          <InlineAlert variant="warning" title={t("notConfigured")} className="mb-4">
            {t("notConfiguredDescription")}
          </InlineAlert>
        ) : null}
        {error ? (
          <InlineAlert className="mb-4" title={error} />
        ) : sessionError?.status === 401 ? (
          <InlineAlert className="mb-4" title={t("sessionRejected")} />
        ) : null}

        <Button
          size="lg"
          variant="outline"
          className="h-11 w-full gap-3 text-base"
          onClick={handleSignIn}
          loading={busy}
          disabled={!configured}
        >
          {!busy ? <GoogleIcon className="size-5" /> : null}
          {t("continueWithGoogle")}
        </Button>

        <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {t("benefitOneAccount")}
          </li>
          <li className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {t("benefitNoPassword")}
          </li>
        </ul>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("termsNotice")}{" "}
          <Link href="/about" className="underline underline-offset-2 hover:text-foreground">
            {t("aboutLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
