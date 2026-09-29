"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { CopyButton } from "@/components/common/copy-button";
import { formatDateTime } from "@/lib/datetime";
import { useCreateCredential, useRevokeCredential } from "../hooks";
import { MAX_ACTIVE_CREDENTIALS, type AdminProduct, type CredentialSummary, type IssuedCredential } from "../type";
import { canCreateCredential, canRevokeCredential } from "../utils";
import { CredentialSecretDialog } from "./credential-secret-dialog";

/**
 * Client credentials the product uses to call the hub (ADR-003 §8). Up to
 * two are active, so a secret can be rotated: create a new one, deploy it,
 * then revoke the old one.
 */
export function CredentialsCard({ product }: { product: AdminProduct }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const create = useCreateCredential(product.id);
  const revoke = useRevokeCredential(product.id);
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [revoking, setRevoking] = useState<CredentialSummary | null>(null);
  const canCreate = canCreateCredential(product);
  const canRevoke = canRevokeCredential(product);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("products.credentials.title")}</CardTitle>
        <CardDescription>{t("products.credentials.description", { max: MAX_ACTIVE_CREDENTIALS })}</CardDescription>
        <CardAction>
          <Button
            size="sm"
            variant="outline"
            loading={create.isPending}
            disabled={!canCreate}
            onClick={() => create.mutate(undefined, { onSuccess: setIssued })}
          >
            <Plus aria-hidden />
            {t("products.credentials.new")}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {create.error ? <ApiErrorAlert error={create.error} /> : null}
        {product.credentials.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t("products.credentials.empty")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {product.credentials.map((credential) => (
              <li key={credential.clientId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <p className="flex items-center gap-1.5 font-mono text-sm">
                    <KeyRound className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{credential.clientId}</span>
                    <CopyButton value={credential.clientId} label={t("products.credentials.copyClientId")} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("products.credentials.created", { date: formatDateTime(credential.createdAt, { locale }) })}
                    {" · "}
                    {credential.lastUsedAt
                      ? t("products.credentials.lastUsed", { date: formatDateTime(credential.lastUsedAt, { locale }) })
                      : t("products.credentials.neverUsed")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="self-start text-destructive sm:self-auto"
                  disabled={!canRevoke}
                  title={canRevoke ? undefined : t("products.credentials.lastOne")}
                  onClick={() => {
                    revoke.reset();
                    setRevoking(credential);
                  }}
                >
                  <Trash2 aria-hidden />
                  {t("products.credentials.revoke")}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {!canCreate ? (
          <p className="text-xs text-muted-foreground">{t("products.credentials.limit", { max: MAX_ACTIVE_CREDENTIALS })}</p>
        ) : null}
        {!canRevoke && product.credentials.length === 1 ? (
          <p className="text-xs text-muted-foreground">{t("products.credentials.lastOne")}</p>
        ) : null}
      </CardContent>

      <CredentialSecretDialog credential={issued} onClose={() => setIssued(null)} />
      <ConfirmDialog
        open={Boolean(revoking)}
        onOpenChange={(open) => !open && setRevoking(null)}
        title={t("products.credentials.revokeTitle")}
        description={t("products.credentials.revokeDescription", { clientId: revoking?.clientId })}
        destructive
        confirmLabel={t("products.credentials.revoke")}
        loading={revoke.isPending}
        onConfirm={() => revoking && revoke.mutate(revoking.clientId, { onSuccess: () => setRevoking(null) })}
      >
        {revoke.error ? <ApiErrorAlert error={revoke.error} /> : null}
      </ConfirmDialog>
    </Card>
  );
}
