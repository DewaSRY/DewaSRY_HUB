import { z } from "zod";

/**
 * Article metadata form (the settings sheet + title). Messages are i18n keys
 * resolved by `zodResolverTranslate`. Only the slug format is strict; excerpt
 * and category may be empty on a draft (required to publish, ADR-003 §10.3).
 */
export const articleFormSchema = z.object({
  title: z.string().trim().min(1, "articles.errors.titleRequired").max(200, "articles.errors.titleTooLong"),
  slug: z
    .string()
    .trim()
    .max(120, "articles.errors.slugTooLong")
    .regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/, "articles.errors.slugFormat"),
  excerpt: z.string().max(300, "articles.errors.excerptTooLong"),
  coverImageId: z.string().nullable(),
  categoryId: z.string().nullable(),
  tagIds: z.array(z.string()),
  metaTitle: z.string().max(120, "articles.errors.metaTitleTooLong"),
  metaDescription: z.string().max(320, "articles.errors.metaDescriptionTooLong"),
});

export type ArticleFormValues = z.infer<typeof articleFormSchema>;

export const ARTICLE_FORM_FIELDS = [
  "title",
  "slug",
  "excerpt",
  "coverImageId",
  "categoryId",
  "tagIds",
  "metaTitle",
  "metaDescription",
] as const satisfies readonly (keyof ArticleFormValues)[];

export const EMPTY_ARTICLE_FORM: ArticleFormValues = {
  title: "",
  slug: "",
  excerpt: "",
  coverImageId: null,
  categoryId: null,
  tagIds: [],
  metaTitle: "",
  metaDescription: "",
};
