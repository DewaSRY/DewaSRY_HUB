"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GoogleIcon, loginHref, signInWithGoogle, waitForSession } from "@/feature/auth";
import type { PendingAction } from "../type";

type Failure = "failed" | "not-configured" | null;

/**
 * R1 / ADR-010 §8.3: a Visitor who tries to vote or comment is asked to sign
 * in with the Google popup, so they never leave the article. The caller
 * replays the action once the session exists.
 */
export function SignInPromptDialog({
  action,
  onCancel,
  onSignedIn,
}: {
  action: PendingAction | null;
  onCancel: () => void;
  onSignedIn: () => void;
}) {
  const { t } = useTranslation("engagement");
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);

  async function handleSignIn() {
    setBusy(true);
    setFailure(null);
    const result = await signInWithGoogle();
    if (result.ok) {
      await waitForSession();
      setBusy(false);
      onSignedIn();
      return;
    }
    setBusy(false);
    // Closing the popup is a choice, not an error: stay on the dialog quietly.
    if (result.reason !== "cancelled") setFailure(result.reason);
  }

  return (
    <Dialog
      open={action !== null}
      onOpenChange={(open) => {
        if (!open && !busy) {
          setFailure(null);
          onCancel();
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("signIn.title")}</DialogTitle>
          <DialogDescription>{action?.type === "vote" ? t("signIn.vote") : t("signIn.comment")}</DialogDescription>
        </DialogHeader>
        {failure ? (
          <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {failure === "not-configured" ? t("signIn.unavailable") : t("signIn.failed")}{" "}
            <Link href={loginHref(pathname, "#discussion")} className="font-medium underline underline-offset-4">
              {t("signIn.loginPage")}
            </Link>
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {t("signIn.notNow")}
          </Button>
          <Button onClick={handleSignIn} loading={busy}>
            <GoogleIcon className="size-4" aria-hidden />
            {t("signIn.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
