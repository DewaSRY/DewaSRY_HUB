"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputField } from "@/components/form/input-field";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { applyApiFieldErrors, toApiError } from "@/lib/api/error";
import { zodResolverTranslate } from "@/lib/form";
import { useAddRedirectUri, useRemoveRedirectUri } from "../hooks";
import { redirectUriSchema, type RedirectUriFormValues } from "../schema";
import type { AdminProduct, RedirectUri } from "../type";

/** SSO redirect URI allow-list (ADR-001 §5.7): exact match, HTTPS, no wildcard. */
export function RedirectUrisCard({ product }: { product: AdminProduct }) {
  const { t } = useTranslation("admin");
  const add = useAddRedirectUri(product.id);
  const remove = useRemoveRedirectUri(product.id);
  const [removing, setRemoving] = useState<RedirectUri | null>(null);
  const form = useForm<RedirectUriFormValues>({
    resolver: zodResolverTranslate(redirectUriSchema, t),
    defaultValues: { uri: "" },
  });

  async function onSubmit(values: RedirectUriFormValues) {
    try {
      await add.mutateAsync(values.uri.trim());
      form.reset({ uri: "" });
    } catch (error) {
      applyApiFieldErrors(error, form.setError, ["uri"] as const);
      // 409: the URI is already registered.
      if (toApiError(error)?.status === 409) form.setError("uri", { type: "server", message: t("products.redirects.duplicate") });
    }
  }

  const showAlert = add.error && !form.formState.errors.uri;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("products.redirects.title")}</CardTitle>
        <CardDescription>{t("products.redirects.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2 sm:flex-row sm:items-start" noValidate>
          <InputField
            control={form.control}
            name="uri"
            className="flex-1"
            aria-label={t("products.redirects.uri")}
            placeholder="https://product.example.com/sso/callback"
            description={t("products.redirects.hint")}
            type="url"
            inputMode="url"
            maxLength={2000}
            autoCapitalize="none"
            spellCheck={false}
          />
          <Button type="submit" variant="outline" loading={add.isPending}>
            <Plus aria-hidden />
            {t("products.redirects.add")}
          </Button>
        </form>
        {showAlert ? <ApiErrorAlert error={add.error} /> : null}
        {product.redirectUris.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{t("products.redirects.empty")}</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {product.redirectUris.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 p-3">
                <span className="flex min-w-0 items-center gap-2 font-mono text-xs sm:text-sm">
                  <Link2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="break-all">{item.uri}</span>
                </span>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 text-destructive"
                  aria-label={t("products.redirects.remove")}
                  onClick={() => {
                    remove.reset();
                    setRemoving(item);
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("products.redirects.removeTitle")}
        description={t("products.redirects.removeDescription", { uri: removing?.uri })}
        destructive
        confirmLabel={t("products.redirects.remove")}
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing.id, { onSuccess: () => setRemoving(null) })}
      >
        {remove.error ? <ApiErrorAlert error={remove.error} /> : null}
      </ConfirmDialog>
    </Card>
  );
}
