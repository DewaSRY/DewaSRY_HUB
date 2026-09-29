"use client";

import { useTranslation } from "react-i18next";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CopyButton } from "@/components/common/copy-button";
import { InlineAlert } from "@/components/common/inline-alert";
import type { IssuedCredential } from "../type";

/**
 * Shows a new client secret **once** (ADR-003 §10.7). The secret lives only
 * in the parent's state; closing the dialog drops it for good.
 */
export function CredentialSecretDialog({
  credential,
  onClose,
}: {
  credential: IssuedCredential | null;
  onClose: () => void;
}) {
  const { t } = useTranslation("admin");
  return (
    <Dialog open={Boolean(credential)} onOpenChange={(open) => !open && onClose()} disablePointerDismissal>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4" aria-hidden />
            {t("products.credentials.secretTitle")}
          </DialogTitle>
          <DialogDescription>{t("products.credentials.secretDescription")}</DialogDescription>
        </DialogHeader>
        {credential ? (
          <div className="grid gap-3">
            <SecretRow label={t("products.credentials.clientId")} value={credential.clientId} copyLabel={t("products.credentials.copyClientId")} />
            <SecretRow
              label={t("products.credentials.clientSecret")}
              value={credential.clientSecret}
              copyLabel={t("products.credentials.copySecret")}
            />
            <InlineAlert variant="warning" title={t("products.credentials.secretOnce")} />
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose}>{t("products.credentials.secretDone")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SecretRow({ label, value, copyLabel }: { label: string; value: string; copyLabel: string }) {
  return (
    <div className="grid gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
        <code className="min-w-0 flex-1 font-mono text-xs break-all select-all">{value}</code>
        <CopyButton value={value} label={copyLabel} />
      </div>
    </div>
  );
}
