"use client";

import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputField } from "@/components/form/input-field";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { applyApiFieldErrors, toApiError } from "@/lib/api/error";
import { zodResolverTranslate } from "@/lib/form";
import { slugify } from "@/lib/utils";
import { useCreateTaxonomy, useUpdateTaxonomy } from "../hooks";
import { taxonomySchema, type TaxonomyFormValues } from "../schema";
import type { AdminTaxonomy, TaxonomyKind } from "../type";

/** Create or rename a category / tag (UC-20). Slug is auto from the name, editable. */
export function TaxonomyFormDialog({
  kind,
  item,
  open,
  onOpenChange,
}: {
  kind: TaxonomyKind;
  item: AdminTaxonomy | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("admin");
  const create = useCreateTaxonomy(kind);
  const update = useUpdateTaxonomy(kind);
  const mutation = item ? update : create;
  const form = useForm<TaxonomyFormValues>({
    resolver: zodResolverTranslate(taxonomySchema, t),
    defaultValues: { name: item?.name ?? "", slug: item?.slug ?? "" },
  });
  const name = useWatch({ control: form.control, name: "name" });
  const slugTouched = form.formState.dirtyFields.slug;

  useEffect(() => {
    if (open) form.reset({ name: item?.name ?? "", slug: item?.slug ?? "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens.
  }, [open, item]);

  const suggestedSlug = slugify(name ?? "");

  async function onSubmit(values: TaxonomyFormValues) {
    const body = { name: values.name.trim(), slug: values.slug.trim() || undefined };
    try {
      if (item) await update.mutateAsync({ id: item.id, body });
      else await create.mutateAsync(body);
      onOpenChange(false);
    } catch (error) {
      // 409 NAME_TAKEN / SLUG_TAKEN arrive as field errors when the API names the field.
      applyApiFieldErrors(error, form.setError, ["name", "slug"] as const);
      if (toApiError(error)?.status === 409 && !toApiError(error)?.fieldErrors.length) {
        form.setError("name", { type: "server", message: toApiError(error)!.message });
      }
    }
  }

  const noun = t(kind === "categories" ? "taxonomy.category" : "taxonomy.tag");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>{item ? t("taxonomy.editTitle", { noun }) : t("taxonomy.createTitle", { noun })}</DialogTitle>
            <DialogDescription>{item ? t("taxonomy.editDescription") : t("taxonomy.createDescription")}</DialogDescription>
          </DialogHeader>
          <InputField control={form.control} name="name" label={t("taxonomy.name")} autoFocus maxLength={80} />
          <InputField
            control={form.control}
            name="slug"
            label={t("taxonomy.slug")}
            placeholder={suggestedSlug || "devops"}
            description={slugTouched || item ? t("taxonomy.slugHint") : t("taxonomy.slugAuto", { slug: suggestedSlug || "—" })}
            maxLength={120}
          />
          {mutation.error && !form.formState.errors.name && !form.formState.errors.slug ? <ApiErrorAlert error={mutation.error} /> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel", { ns: "common" })}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {item ? t("save", { ns: "common" }) : t("create", { ns: "common" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
