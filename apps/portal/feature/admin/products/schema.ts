import { z } from "zod";
import { MAX_FEATURES_BYTES } from "./type";
import { parseFeatures, redirectUriProblem } from "./utils";

// Messages are i18n keys in the `admin` namespace (docs/FORM_ERROR_TRANSLATION.md).
const CODE_PATTERN = /^[a-z0-9-]+$/;

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

/** `code` is only sent on create; it is immutable afterwards (ADR-003 §10.7). */
export const productSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "products.errors.codeRequired")
    .max(64, "products.errors.codeTooLong")
    .regex(CODE_PATTERN, "products.errors.codeFormat"),
  name: z.string().trim().min(1, "products.errors.nameRequired").max(120, "products.errors.nameTooLong"),
  description: z.string().trim().max(5000, "products.errors.descriptionTooLong"),
  websiteUrl: z
    .string()
    .trim()
    .max(2000, "products.errors.urlTooLong")
    .refine((value) => value === "" || isHttpUrl(value), "products.errors.websiteUrl"),
  active: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

/**
 * Price is typed as text (whole rupiah) and converted by `toPlanInput()`.
 * `billingPeriod` is `""` for a free plan. `features` is JSON text.
 */
export const planSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "products.errors.codeRequired")
      .max(64, "products.errors.codeTooLong")
      .regex(CODE_PATTERN, "products.errors.codeFormat"),
    name: z.string().trim().min(1, "products.errors.nameRequired").max(120, "products.errors.nameTooLong"),
    price: z
      .string()
      .trim()
      .min(1, "products.errors.priceRequired")
      .regex(/^\d{1,12}$/, "products.errors.priceFormat"),
    billingPeriod: z.enum(["", "MONTHLY", "YEARLY"]),
    features: z.string(),
    public: z.boolean(),
    active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const amount = Number(values.price || "0");
    if (amount > 0 && !values.billingPeriod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["billingPeriod"], message: "products.errors.periodRequired" });
    }
    if (amount === 0 && values.billingPeriod) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["billingPeriod"], message: "products.errors.periodFree" });
    }
    const features = parseFeatures(values.features);
    if (!features.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["features"], message: "products.errors.featuresJson" });
    } else if (new TextEncoder().encode(JSON.stringify(features.value)).length > MAX_FEATURES_BYTES) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["features"], message: "products.errors.featuresTooLarge" });
    }
  });

export type PlanFormValues = z.infer<typeof planSchema>;

/** Same rules as the API (ADR-001 §5.7); `http://localhost` is accepted only when the API allows it. */
export const redirectUriSchema = z.object({
  uri: z
    .string()
    .trim()
    .min(1, "products.errors.uriRequired")
    .max(2000, "products.errors.urlTooLong")
    .superRefine((value, ctx) => {
      const problem = redirectUriProblem(value);
      if (problem) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `products.errors.uri.${problem}` });
    }),
});

export type RedirectUriFormValues = z.infer<typeof redirectUriSchema>;
