"use client";

import { useState } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { ImagePlus, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { InputField } from "@/components/form/input-field";
import { TextareaField } from "@/components/form/textarea-field";
import { cn, slugify } from "@/lib/utils";
import { SITE_URL } from "@/lib/seo/metadata";
import { languageName, ResponsiveImage, type ContentLocale, type ImageAsset } from "@/feature/content";
import { MediaPickerDialog } from "@/feature/admin/media";
import { useTaxonomyList } from "@/feature/admin/taxonomy";
import type { ArticleFormValues } from "../schema";
import { SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, seoPreview } from "../utils";

function Counter({ value, max }: { value: number; max: number }) {
  return <span className={cn("text-xs tabular-nums", value > max ? "font-medium text-warning" : "text-muted-foreground")}>{value}/{max}</span>;
}

/**
 * Settings side sheet (ADR-009 §5.1). Shared by every language: slug, cover
 * image, category, tags. For the language being edited: excerpt, meta
 * title/description, and a live Google-result preview. It edits the page's
 * React Hook Form, so values are saved with the body.
 */
export function ArticleSettingsSheet({
  form,
  open,
  onOpenChange,
  coverImage,
  onCoverChange,
  locale,
  activeLocale,
}: {
  form: UseFormReturn<ArticleFormValues>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coverImage: ImageAsset | null;
  onCoverChange: (image: ImageAsset | null) => void;
  locale: string;
  /** The language whose excerpt / SEO fields are shown; `null` when it is not written yet. */
  activeLocale: ContentLocale | null;
}) {
  const { t } = useTranslation("admin");
  const [pickerOpen, setPickerOpen] = useState(false);
  const categories = useTaxonomyList("categories");
  const tags = useTaxonomyList("tags");
  const [slug, translations] = useWatch({ control: form.control, name: ["slug", "translations"] });
  const current = activeLocale ? translations?.[activeLocale] : undefined;
  const title = current?.title ?? "";
  const excerpt = current?.excerpt ?? "";
  const metaTitle = current?.metaTitle ?? "";
  const metaDescription = current?.metaDescription ?? "";
  const preview = seoPreview({ title, metaTitle, excerpt, metaDescription });
  const language = activeLocale ? languageName(activeLocale, locale) : "";
  // The slug is shared; it is generated from the first language's title.
  const slugSource = Object.values(translations ?? {}).find((item) => item?.title.trim())?.title ?? "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("articles.settings.title")}</SheetTitle>
          <SheetDescription>{t("articles.settings.description")}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-8">
          <div className="flex items-end gap-2">
            <InputField
              control={form.control}
              name="slug"
              label={t("articles.settings.slug")}
              description={t("articles.settings.slugHint")}
              className="flex-1"
              maxLength={120}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="mb-6"
              aria-label={t("articles.settings.slugFromTitle")}
              onClick={() => form.setValue("slug", slugify(title || slugSource), { shouldDirty: true, shouldValidate: true })}
            >
              <RefreshCw aria-hidden />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t("articles.settings.cover")}</Label>
            {coverImage ? (
              <div className="relative overflow-hidden rounded-xl border">
                <ResponsiveImage image={coverImage} sizes="512px" className="aspect-[16/9] rounded-none" />
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button type="button" size="xs" variant="secondary" onClick={() => setPickerOpen(true)}>
                    {t("articles.settings.replace")}
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="secondary"
                    aria-label={t("articles.settings.removeCover")}
                    onClick={() => {
                      onCoverChange(null);
                      form.setValue("coverImageId", null, { shouldDirty: true });
                    }}
                  >
                    <X aria-hidden />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted-foreground transition-colors hover:border-ring/60 hover:bg-muted/40"
              >
                <ImagePlus className="size-6" aria-hidden />
                {t("articles.settings.chooseCover")}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="article-category">{t("articles.settings.category")}</Label>
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <NativeSelect
                  id="article-category"
                  className="w-full"
                  value={field.value ?? ""}
                  onChange={(event) => field.onChange(event.target.value || null)}
                  onBlur={field.onBlur}
                >
                  <option value="">{t("articles.settings.noCategory")}</option>
                  {(categories.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </NativeSelect>
              )}
            />
            <p className="text-xs text-muted-foreground">{t("articles.settings.categoryHint")}</p>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("articles.settings.tags")}</legend>
            <Controller
              control={form.control}
              name="tagIds"
              render={({ field }) => (
                <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border p-2">
                  {(tags.data ?? []).length === 0 ? (
                    <p className="p-1 text-xs text-muted-foreground">{t("articles.settings.noTags")}</p>
                  ) : (
                    (tags.data ?? []).map((tag) => {
                      const checked = field.value.includes(tag.id);
                      return (
                        <label
                          key={tag.id}
                          className={cn(
                            "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                            checked ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                          )}
                        >
                          <Checkbox
                            className="size-3.5"
                            checked={checked}
                            onChange={(event) =>
                              field.onChange(
                                event.target.checked ? [...field.value, tag.id] : field.value.filter((id) => id !== tag.id),
                              )
                            }
                          />
                          {tag.name}
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            />
          </fieldset>

          {activeLocale ? (
            <div key={activeLocale} lang={activeLocale} className="space-y-5 rounded-xl border p-4">
              <div className="space-y-0.5">
                <p className="text-sm font-semibold">{t("articles.settings.languageSection", { language })}</p>
                <p className="text-xs text-muted-foreground">{t("articles.settings.languageSectionHint")}</p>
              </div>
              <TextareaField
                control={form.control}
                name={`translations.${activeLocale}.excerpt`}
                label={t("articles.settings.excerpt")}
                description={t("articles.settings.excerptHint")}
                counter
                maxLength={300}
                rows={3}
              />
              <p className="text-sm font-medium">{t("articles.settings.seo")}</p>
              <div className="space-y-1">
                <InputField
                  control={form.control}
                  name={`translations.${activeLocale}.metaTitle`}
                  label={t("articles.settings.metaTitle")}
                  placeholder={title}
                  maxLength={120}
                />
                <div className="flex justify-end">
                  <Counter value={(metaTitle || title).length} max={SEO_TITLE_MAX} />
                </div>
              </div>
              <div className="space-y-1">
                <TextareaField
                  control={form.control}
                  name={`translations.${activeLocale}.metaDescription`}
                  label={t("articles.settings.metaDescription")}
                  placeholder={excerpt}
                  rows={3}
                  maxLength={320}
                />
                <div className="flex justify-end">
                  <Counter value={(metaDescription || excerpt).length} max={SEO_DESCRIPTION_MAX} />
                </div>
              </div>
              <div className="space-y-1 rounded-lg bg-muted/40 p-3" aria-label={t("articles.settings.googlePreview")}>
                <p className="text-xs text-muted-foreground">{t("articles.settings.googlePreview")}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {SITE_URL.replace(/^https?:\/\//, "")} › {activeLocale} › blog › {slug || "…"}
                </p>
                <p className="truncate text-base font-medium text-[#1a0dab] dark:text-[#8ab4f8]">{preview.title || t("articles.untitled")}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{preview.description || t("articles.settings.noDescription")}</p>
                {preview.titleTooLong || preview.descriptionTooLong ? (
                  <p className="pt-1 text-xs text-warning">
                    {preview.titleTooLong ? t("articles.settings.titleTooLong", { max: SEO_TITLE_MAX }) : null}{" "}
                    {preview.descriptionTooLong ? t("articles.settings.descriptionTooLong", { max: SEO_DESCRIPTION_MAX }) : null}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title={t("articles.settings.chooseCover")}
        onPick={(image) => {
          onCoverChange(image);
          form.setValue("coverImageId", image.id, { shouldDirty: true });
        }}
      />
    </Sheet>
  );
}
