import type { BillingPeriod } from "@/feature/product";
import type { AdminPlan, AdminProduct, PlanInput, PlanPatch, ProductPatch } from "./type";
import { MAX_ACTIVE_CREDENTIALS } from "./type";

/** Form shape of a plan (see `planSchema`): text price, `""` period, JSON text features. */
export interface PlanFormShape {
  code: string;
  name: string;
  price: string;
  billingPeriod: "" | BillingPeriod;
  features: string;
  public: boolean;
  active: boolean;
}

/** Form shape of a product (see `productSchema`). */
export interface ProductFormShape {
  code: string;
  name: string;
  description: string;
  websiteUrl: string;
  active: boolean;
}

/** `features` text → JSON object. Empty text is `{}`. Arrays and scalars are rejected. */
export function parseFeatures(text: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
  if (!text.trim()) return { ok: true, value: {} };
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return { ok: false };
    return { ok: true, value: value as Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

export function formatFeatures(features: Record<string, unknown> | null | undefined): string {
  return features && Object.keys(features).length ? JSON.stringify(features, null, 2) : "";
}

export function planToForm(plan: AdminPlan | null): PlanFormShape {
  if (!plan) return { code: "", name: "", price: "", billingPeriod: "MONTHLY", features: "", public: true, active: true };
  return {
    code: plan.code,
    name: plan.name,
    price: String(plan.price.amount),
    billingPeriod: plan.billingPeriod ?? "",
    features: formatFeatures(plan.features),
    public: plan.public,
    active: plan.active,
  };
}

/** Valid form values → `PlanInput` for `POST /admin/products/{id}/plans`. */
export function toPlanInput(values: PlanFormShape): PlanInput {
  const amount = Number(values.price.trim() || "0");
  const features = parseFeatures(values.features);
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    price: { amount, currency: "IDR" },
    billingPeriod: amount === 0 ? null : values.billingPeriod || null,
    features: features.ok ? features.value : {},
    public: values.public,
    active: values.active,
  };
}

/**
 * Only the fields that changed, for `PATCH /admin/plans/{id}`. Price and
 * billing period are left out once the plan is sold (the API answers
 * `409 PLAN_SOLD` otherwise). `null` when nothing changed.
 */
export function planPatchBody(plan: AdminPlan, values: PlanFormShape): PlanPatch | null {
  const next = toPlanInput({ ...values, code: plan.code });
  const body: PlanPatch = {};
  if (next.name !== plan.name) body.name = next.name;
  if (JSON.stringify(next.features) !== JSON.stringify(plan.features ?? {})) body.features = next.features;
  if (next.public !== plan.public) body.public = next.public;
  if (next.active !== plan.active) body.active = next.active;
  if (!plan.sold) {
    if (next.price.amount !== plan.price.amount) body.price = next.price;
    if (next.billingPeriod !== plan.billingPeriod) body.billingPeriod = next.billingPeriod;
  }
  return Object.keys(body).length ? body : null;
}

export function productToForm(product: AdminProduct | null): ProductFormShape {
  return {
    code: product?.code ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    websiteUrl: product?.websiteUrl ?? "",
    active: product?.active ?? true,
  };
}

/** Changed fields only, for `PATCH /admin/products/{id}`; `""` clears a text field. `null` when nothing changed. */
export function productPatchBody(product: AdminProduct, values: ProductFormShape): ProductPatch | null {
  const body: ProductPatch = {};
  const name = values.name.trim();
  const description = values.description.trim() || null;
  const websiteUrl = values.websiteUrl.trim() || null;
  if (name !== product.name) body.name = name;
  if (description !== (product.description ?? null)) body.description = description;
  if (websiteUrl !== (product.websiteUrl ?? null)) body.websiteUrl = websiteUrl;
  if (values.active !== product.active) body.active = values.active;
  return Object.keys(body).length ? body : null;
}

export type RedirectUriProblem = "absolute" | "fragment" | "https";

/**
 * Redirect URI rules (ADR-001 §5.7): absolute, no fragment, no wildcard,
 * HTTPS — or `http://localhost` / `127.0.0.1`, which the API accepts only
 * when its dev flag is on (it answers `400` otherwise).
 */
export function redirectUriProblem(value: string): RedirectUriProblem | null {
  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return "absolute";
  }
  if (!url.hostname || !/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return "absolute";
  if (trimmed.includes("#") || trimmed.includes("*")) return "fragment";
  if (url.protocol === "https:") return null;
  const localhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  return url.protocol === "http:" && localhost ? null : "https";
}

export function canCreateCredential(product: Pick<AdminProduct, "credentials">): boolean {
  return product.credentials.length < MAX_ACTIVE_CREDENTIALS;
}

/** The last active credential cannot be revoked (`409 LAST_CREDENTIAL`). */
export function canRevokeCredential(product: Pick<AdminProduct, "credentials">): boolean {
  return product.credentials.length > 1;
}

/** A second active free plan is refused by the API (`409 FREE_PLAN_EXISTS`). */
export function hasActiveFreePlan(plans: readonly AdminPlan[], exceptId?: string): boolean {
  return plans.some((plan) => plan.id !== exceptId && plan.active && plan.price.amount === 0);
}
