import { z } from "zod";
import { CONTENT_LOCALES, type ContentLocale } from "@/feature/content";

/**
 * One language of the article form: title (in the editor) plus excerpt and
 * SEO fields (in the settings sheet). Messages are i18n keys resolved by
 * `zodResolverTranslate`.
 */
export const translationFormSchema = z.object({
  title: z.string().trim().min(1, "articles.errors.titleRequired").max(200, "articles.errors.titleTooLong"),
  excerpt: z.string().max(300, "articles.errors.excerptTooLong"),
  metaTitle: z.string().max(120, "articles.errors.metaTitleTooLong"),
  metaDescription: z.string().max(320, "articles.errors.metaDescriptionTooLong"),
});

/**
 * Article metadata form. Slug, cover, category, and tags are shared by every
 * language; `translations` holds one entry per language the article has
 * (a missing key = not written in that language). Only the slug format is
 * strict; excerpt and category may be empty on a draft (required to
 * publish, ADR-003 §10.3).
 */
export const articleFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .max(120, "articles.errors.slugTooLong")
    .regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/, "articles.errors.slugFormat"),
  coverImageId: z.string().nullable(),
  categoryId: z.string().nullable(),
  tagIds: z.array(z.string()),
  translations: z.record(z.enum(CONTENT_LOCALES as [ContentLocale, ...ContentLocale[]]), translationFormSchema),
});

export type TranslationFormValues = z.infer<typeof translationFormSchema>;
export type ArticleFormValues = z.infer<typeof articleFormSchema>;

/** Fields shared by every language (all in the settings sheet). */
export const SHARED_FORM_FIELDS = ["slug", "coverImageId", "categoryId", "tagIds"] as const satisfies readonly (keyof ArticleFormValues)[];

/** Per-language fields; `excerpt`, `metaTitle`, `metaDescription` are in the settings sheet. */
export const TRANSLATION_FORM_FIELDS = ["title", "excerpt", "metaTitle", "metaDescription"] as const satisfies readonly (keyof TranslationFormValues)[];

export const EMPTY_TRANSLATION_FORM: TranslationFormValues = { title: "", excerpt: "", metaTitle: "", metaDescription: "" };

export const EMPTY_ARTICLE_FORM: ArticleFormValues = {
  slug: "",
  coverImageId: null,
  categoryId: null,
  tagIds: [],
  translations: {},
};
