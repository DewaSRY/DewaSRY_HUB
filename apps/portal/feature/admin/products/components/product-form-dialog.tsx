"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputField } from "@/components/form/input-field";
import { TextareaField } from "@/components/form/textarea-field";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { applyApiFieldErrors, toApiError } from "@/lib/api/error";
import { zodResolverTranslate } from "@/lib/form";
import { useCreateProduct, useUpdateProduct } from "../hooks";
import { productSchema, type ProductFormValues } from "../schema";
import type { AdminProduct } from "../type";
import { productPatchBody, productToForm } from "../utils";
import { SwitchField } from "./form-fields";

const FIELDS = ["code", "name", "description", "websiteUrl", "active"] as const;

/**
 * Create a product (UC-21) or edit its name, description, website, and
 * active flag. `code` is set once and never changes (products use it in URLs).
 */
export function ProductFormDialog({
  product,
  open,
  onOpenChange,
  onCreated,
}: {
  product: AdminProduct | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the new product, including its one-time `credential`. */
  onCreated?: (product: AdminProduct) => void;
}) {
  const { t } = useTranslation("admin");
  const create = useCreateProduct();
  const update = useUpdateProduct(product?.id ?? "");
  const mutation = product ? update : create;
  const form = useForm<ProductFormValues>({
    resolver: zodResolverTranslate(productSchema, t),
    defaultValues: productToForm(product),
  });
  // `error[]` items that name no form field.
  const [extra, setExtra] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      form.reset(productToForm(product));
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens.
  }, [open, product]);

  async function onSubmit(values: ProductFormValues) {
    setExtra([]);
    try {
      if (product) {
        const body = productPatchBody(product, values);
        if (body) await update.mutateAsync(body);
        onOpenChange(false);
        return;
      }
      const created = await create.mutateAsync({
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description.trim() || null,
        websiteUrl: values.websiteUrl.trim() || null,
        active: values.active,
      });
      onOpenChange(false);
      onCreated?.(created);
    } catch (error) {
      const rest = applyApiFieldErrors(error, form.setError, FIELDS);
      // 409 CODE_TAKEN has no field; it can only be the code.
      if (toApiError(error)?.status === 409 && !product) {
        form.setError("code", { type: "server", message: t("products.errors.codeTaken") });
      } else {
        setExtra(rest);
      }
    }
  }

  const fieldError = FIELDS.some((field) => form.formState.errors[field]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>{product ? t("products.form.editTitle") : t("products.form.createTitle")}</DialogTitle>
            <DialogDescription>{product ? t("products.form.editDescription") : t("products.form.createDescription")}</DialogDescription>
          </DialogHeader>
          <InputField
            control={form.control}
            name="code"
            label={t("products.fields.code")}
            description={product ? t("products.form.codeLocked") : t("products.form.codeHint")}
            placeholder="document-doctor"
            disabled={Boolean(product)}
            maxLength={64}
            autoFocus={!product}
            autoCapitalize="none"
            spellCheck={false}
          />
          <InputField control={form.control} name="name" label={t("products.fields.name")} maxLength={120} autoFocus={Boolean(product)} />
          <TextareaField control={form.control} name="description" label={t("products.fields.description")} rows={3} maxLength={5000} />
          <InputField
            control={form.control}
            name="websiteUrl"
            label={t("products.fields.websiteUrl")}
            description={t("products.form.websiteHint")}
            placeholder="https://"
            type="url"
            inputMode="url"
            maxLength={2000}
          />
          <SwitchField
            control={form.control}
            name="active"
            label={t("products.fields.active")}
            description={t("products.form.activeHint")}
          />
          {mutation.error && (!fieldError || extra.length) ? <ApiErrorAlert error={mutation.error} extra={extra} /> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel", { ns: "common" })}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {product ? t("save", { ns: "common" }) : t("create", { ns: "common" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
