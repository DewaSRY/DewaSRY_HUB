"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Loader2, ShieldAlert, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/common/inline-alert";
import { toApiError, type ApiError } from "@/lib/api/error";
import { GoogleIcon, retrySession, signInWithGoogle, signOut, useSession } from "@/feature/auth";
import { useCreateSsoCode } from "../hooks";
import { buildRedirect, redirectHost, validateAuthorizeParams } from "../utils";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      <div className="rounded-2xl border bg-card/90 p-6 text-center shadow-xl backdrop-blur-sm sm:p-8">{children}</div>
    </div>
  );
}

/**
 * `/sso/authorize` (UC-06, ADR-001 §5.7): validate the request, sign in with
 * Google if needed, ask the API for a one-time code, and send the browser to
 * `redirect_uri?code&state`. Already signed in → straight back, no prompt.
 */
export function SsoAuthorizeScreen() {
  const { t } = useTranslation("auth");
  const searchParams = useSearchParams();
  const validation = useMemo(() => validateAuthorizeParams(searchParams), [searchParams]);
  const { status, me, firebaseUser, sessionError } = useSession();
  const createCode = useCreateSsoCode();
  const [error, setError] = useState<ApiError | null>(null);
  const [signInError, setSignInError] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (!validation.ok || status !== "signed-in" || !me || requested.current) return;
    requested.current = true;
    const { params } = validation;
    createCode
      .mutateAsync({
        clientId: params.clientId,
        redirectUri: params.redirectUri,
        codeChallenge: params.codeChallenge,
        codeChallengeMethod: params.codeChallengeMethod,
      })
      .then(({ code }) => {
        setRedirecting(true);
        window.location.replace(buildRedirect(params.redirectUri, code, params.state));
      })
      .catch((cause) => {
        requested.current = false;
        setError(toApiError(cause));
      });
  }, [validation, status, me, createCode]);

  if (!validation.ok) {
    return (
      <Card>
        <ShieldX className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">{t("sso.invalidTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("sso.invalidDescription")}</p>
        <p className="mt-4 rounded-md bg-muted px-3 py-2 font-mono text-xs">{t(`sso.reasons.${validation.reason}`)}</p>
      </Card>
    );
  }

  const host = redirectHost(validation.params.redirectUri);

  if (error) {
    const rejected = error.status >= 400 && error.status < 500;
    return (
      <Card>
        <ShieldAlert className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">{rejected ? t("sso.rejectedTitle") : t("sso.failedTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{rejected ? t("sso.rejectedDescription") : t("sso.failedDescription")}</p>
        {error.message && rejected ? <p className="mt-3 text-sm">{error.message}</p> : null}
        {error.traceId ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("traceId", { ns: "common" })}: <code>{error.traceId}</code>
          </p>
        ) : null}
        {!rejected ? (
          <Button className="mt-6" onClick={() => setError(null)}>
            {t("tryAgain", { ns: "common" })}
          </Button>
        ) : null}
      </Card>
    );
  }

  if (status === "signed-in" && !me && sessionError) {
    return (
      <Card>
        <ShieldAlert className="mx-auto size-10 text-destructive" aria-hidden />
        <h1 className="mt-4 text-xl font-semibold">{t("sessionErrorTitle")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("sessionErrorDescription")}</p>
        {sessionError.traceId ? (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("traceId", { ns: "common" })}: <code>{sessionError.traceId}</code>
          </p>
        ) : null}
        <Button className="mt-6" onClick={() => void retrySession()}>
          {t("tryAgain", { ns: "common" })}
        </Button>
      </Card>
    );
  }

  if (status === "signed-out") {
    return (
      <Card>
        <h1 className="text-xl font-semibold">{t("sso.signingIn")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("sso.continueTo", { host })}</p>
        {signInError ? <InlineAlert className="mt-4 text-left" title={t("signInFailed")} /> : null}
        <Button
          size="lg"
          variant="outline"
          className="mt-6 h-11 w-full gap-3"
          onClick={async () => {
            setSignInError(false);
            const result = await signInWithGoogle();
            if (!result.ok && result.reason !== "cancelled") setSignInError(true);
          }}
        >
          <GoogleIcon className="size-5" />
          {t("continueWithGoogle")}
        </Button>
      </Card>
    );
  }

  return (
    <Card>
      <Loader2 className="mx-auto size-10 animate-spin text-primary" aria-hidden />
      <h1 className="mt-4 text-xl font-semibold">{redirecting ? t("sso.redirecting") : t("sso.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("sso.continueTo", { host })}</p>
      {firebaseUser?.email ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {t("sso.signedInAs", { email: firebaseUser.email })} ·{" "}
          <button type="button" className="underline underline-offset-2 hover:text-foreground" onClick={() => void signOut()}>
            {t("sso.useAnother")}
          </button>
        </p>
      ) : null}
    </Card>
  );
}
