"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputField } from "@/components/form/input-field";
import { TextareaField } from "@/components/form/textarea-field";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { InlineAlert } from "@/components/common/inline-alert";
import { toApiError } from "@/lib/api/error";
import { zodResolverTranslate } from "@/lib/form";
import { formatMoney } from "@/lib/number";
import { useCreatePlan, useUpdatePlan } from "../hooks";
import { planSchema, type PlanFormValues } from "../schema";
import { BILLING_PERIODS, type AdminPlan } from "../type";
import { hasActiveFreePlan, planPatchBody, planToForm, toPlanInput } from "../utils";
import { SelectField, SwitchField } from "./form-fields";

// API field names → form fields (`price.amount` is the price text box).
const FIELD_MAP: Record<string, keyof PlanFormValues> = {
  code: "code",
  name: "name",
  "price.amount": "price",
  "price.currency": "price",
  price: "price",
  billingPeriod: "billingPeriod",
  features: "features",
};

/**
 * Add or edit a plan (UC-21). Plans are never deleted — deactivate instead
 * (ADR-002 P1). Once sold, price and billing period are locked (`PLAN_SOLD`).
 */
export function PlanFormDialog({
  productId,
  plans,
  plan,
  open,
  onOpenChange,
}: {
  productId: string;
  /** All plans of the product, to warn about a second free plan. */
  plans: AdminPlan[];
  plan: AdminPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("admin");
  const create = useCreatePlan(productId);
  const update = useUpdatePlan(productId);
  const mutation = plan ? update : create;
  const [extra, setExtra] = useState<string[]>([]);
  const form = useForm<PlanFormValues>({
    resolver: zodResolverTranslate(planSchema, t),
    defaultValues: planToForm(plan),
  });
  const price = useWatch({ control: form.control, name: "price" });
  const active = useWatch({ control: form.control, name: "active" });
  const isFree = /^\d+$/.test(price?.trim() ?? "") && Number(price) === 0;
  const locked = Boolean(plan?.sold);

  useEffect(() => {
    if (open) {
      form.reset(planToForm(plan));
      create.reset();
      update.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens.
  }, [open, plan]);

  // A free plan has no billing period; a paid one needs one. Only after the
  // admin edits the price, so opening a plan never rewrites its period.
  useEffect(() => {
    if (locked || !form.getFieldState("price").isDirty) return;
    const current = form.getValues("price").trim();
    const free = /^\d+$/.test(current) && Number(current) === 0;
    const period = form.getValues("billingPeriod");
    if (free && period) form.setValue("billingPeriod", "", { shouldDirty: true });
    if (!free && !period && current) form.setValue("billingPeriod", "MONTHLY", { shouldDirty: true });
  }, [form, locked, price]);

  async function onSubmit(values: PlanFormValues) {
    setExtra([]);
    try {
      if (plan) {
        const body = planPatchBody(plan, values);
        if (body) await update.mutateAsync({ id: plan.id, body });
      } else {
        await create.mutateAsync(toPlanInput(values));
      }
      onOpenChange(false);
    } catch (error) {
      // 400: map `price.amount` & co. onto the form. 409 (CODE_TAKEN,
      // FREE_PLAN_EXISTS, PLAN_SOLD) has no field; the alert shows its message.
      const rest: string[] = [];
      for (const item of toApiError(error)?.fieldErrors ?? []) {
        const field = FIELD_MAP[item.field];
        if (field) form.setError(field, { type: "server", message: item.message });
        else rest.push(item.field ? `${item.field}: ${item.message}` : item.message);
      }
      setExtra(rest);
    }
  }

  const freeConflict = isFree && active && hasActiveFreePlan(plans, plan?.id);
  const fieldError = Object.keys(form.formState.errors).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5" noValidate>
          <DialogHeader>
            <DialogTitle>{plan ? t("products.plans.editTitle", { name: plan.name }) : t("products.plans.createTitle")}</DialogTitle>
            <DialogDescription>{t("products.plans.formDescription")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField
              control={form.control}
              name="code"
              label={t("products.fields.planCode")}
              description={plan ? t("products.plans.codeLocked") : t("products.plans.codeHint")}
              placeholder="dd-pro-monthly"
              disabled={Boolean(plan)}
              maxLength={64}
              autoFocus={!plan}
              autoCapitalize="none"
              spellCheck={false}
            />
            <InputField control={form.control} name="name" label={t("products.fields.name")} maxLength={120} placeholder="Pro" />
          </div>
          {locked ? <InlineAlert variant="info" title={t("products.plans.soldTitle")}>{t("products.plans.soldDescription")}</InlineAlert> : null}
          <div className="grid gap-5 sm:grid-cols-2">
            <InputField
              control={form.control}
              name="price"
              label={t("products.fields.price")}
              description={
                /^\d+$/.test(price?.trim() ?? "") ? formatMoney({ amount: Number(price), currency: "IDR" }) : t("products.plans.priceHint")
              }
              inputMode="numeric"
              placeholder="49000"
              disabled={locked}
              maxLength={12}
            />
            <SelectField
              control={form.control}
              name="billingPeriod"
              label={t("products.fields.billingPeriod")}
              description={t("products.plans.periodHint")}
              disabled={locked || isFree}
            >
              <option value="">{t("products.period.none")}</option>
              {BILLING_PERIODS.map((period) => (
                <option key={period} value={period}>
                  {t(`products.period.${period}`)}
                </option>
              ))}
            </SelectField>
          </div>
          <TextareaField
            control={form.control}
            name="features"
            label={t("products.fields.features")}
            description={t("products.plans.featuresHint")}
            placeholder={'{\n  "removeAds": true\n}'}
            rows={4}
            className="font-mono"
            spellCheck={false}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <SwitchField control={form.control} name="public" label={t("products.fields.public")} description={t("products.plans.publicHint")} />
            <SwitchField control={form.control} name="active" label={t("products.fields.active")} description={t("products.plans.activeHint")} />
          </div>
          {freeConflict ? <InlineAlert variant="warning" title={t("products.plans.freeExists")} /> : null}
          {mutation.error && (!fieldError || extra.length) ? <ApiErrorAlert error={mutation.error} extra={extra} /> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel", { ns: "common" })}
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {plan ? t("save", { ns: "common" }) : t("create", { ns: "common" })}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
