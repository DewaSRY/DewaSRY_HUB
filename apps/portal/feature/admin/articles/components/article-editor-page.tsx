"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ellipsis, Eye, EyeOff, Languages, Save, Send, Settings2, Trash2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { InlineAlert } from "@/components/common/inline-alert";
import { PageContainer } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { GuardedLink } from "@/components/common/navigation-guard/guarded-link";
import { useNavigationGuardStore } from "@/components/common/navigation-guard/store";
import { getApiErrorMessage, toApiError } from "@/lib/api/error";
import { formatTime } from "@/lib/datetime";
import { zodResolverTranslate } from "@/lib/form";
import { pushToast } from "@/lib/toast/store";
import { cn, slugify } from "@/lib/utils";
import {
  CONTENT_LOCALES,
  EMPTY_DOC,
  isContentLocale,
  languageName,
  readingMinutes,
  sortLocales,
  validateDoc,
  type ArticleDoc,
  type BodyImageMap,
  type ContentLocale,
  type ImageAsset,
} from "@/feature/content";
import { useTaxonomyList } from "@/feature/admin/taxonomy";
import { useAdminArticle, useCreateArticle, useDeleteArticle, usePublishArticle, useSaveArticle } from "../hooks";
import { articleQuery } from "../queries";
import { EMPTY_TRANSLATION_FORM, SHARED_FORM_FIELDS, articleFormSchema, type ArticleFormValues } from "../schema";
import type { AdminArticle } from "../type";
import {
  bodyFieldErrors,
  draftKey,
  formLocales,
  isSettingsField,
  isSlugConflict,
  previewKey,
  publishChecklist,
  readJson,
  removeKey,
  shouldOfferRestore,
  splitTranslationField,
  toArticleInput,
  toBodies,
  toFormValues,
  writeJson,
  type ChecklistItem,
  type LocalDraft,
  type LocaleBodies,
  type PreviewPayload,
} from "../utils";
import type { ArticleEditorHandle, ArticleEditorStats } from "../editor/types";
import { ArticleSettingsSheet } from "./article-settings-sheet";
import { ArticleStatusBadge } from "./articles-screen";
import { LanguageTabs, StartTranslationPanel } from "./language-tabs";
import { PublishChecklistDialog } from "./publish-checklist-dialog";
import { VersionConflictDialog } from "./version-conflict-dialog";

// ADR-009 §5.2: the editor is loaded only here, on the client, never on public pages.
const ArticleEditor = dynamic(() => import("../editor/article-editor"), {
  ssr: false,
  loading: () => <Skeleton className="min-h-[60vh] w-full rounded-xl" />,
});

const LOCAL_COPY_DELAY = 1000;

/**
 * `/admin/articles/new` (id `null`) and `/admin/articles/[id]` (UC-16/17/18,
 * ADR-009 §5.1 and §6): loads the article, then hands it to the editor form.
 * The admin writes one version per language (tabs); slug, cover, category,
 * and tags are shared.
 */
export function ArticleEditorPage({ id }: { id: string | null }) {
  const { t } = useTranslation("admin");
  const article = useAdminArticle(id);

  if (id && article.isPending) {
    return (
      <PageContainer className="max-w-5xl">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[60vh] w-full rounded-xl" />
      </PageContainer>
    );
  }
  if (id && article.isError) {
    return (
      <PageContainer className="max-w-5xl">
        <QueryErrorState
          error={article.error}
          onRetry={() => article.refetch()}
          retrying={article.isRefetching}
          title={toApiError(article.error)?.status === 404 ? t("articles.editor.notFound") : undefined}
        />
      </PageContainer>
    );
  }
  return <ArticleEditorForm article={id ? (article.data ?? null) : null} />;
}

interface BodyError {
  locale: ContentLocale;
  message: string;
  path: string | null;
}

type Baselines = Partial<Record<ContentLocale, string>>;

/** The tab to open: the UI language when the article has it, else its first language. */
function initialLocale(article: AdminArticle | null, uiLocale: string): ContentLocale {
  const written = article ? sortLocales(Object.keys(article.translations ?? {})) : [];
  if (written.length) return isContentLocale(uiLocale) && written.includes(uiLocale) ? uiLocale : written[0];
  return isContentLocale(uiLocale) ? uiLocale : CONTENT_LOCALES[0];
}

function initialValues(article: AdminArticle | null, locale: ContentLocale): ArticleFormValues {
  const values = toFormValues(article);
  // A new article starts with the language of the first tab.
  if (!article) values.translations = { [locale]: { ...EMPTY_TRANSLATION_FORM } };
  return values;
}

function serializeBodies(bodies: LocaleBodies): Baselines {
  const result: Baselines = {};
  for (const locale of CONTENT_LOCALES) {
    const body = bodies[locale];
    if (body) result[locale] = JSON.stringify(body);
  }
  return result;
}

function ArticleEditorForm({ article }: { article: AdminArticle | null }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setGuard = useNavigationGuardStore((state) => state.setGuard);
  const articleId = article?.id ?? null;

  const [activeLocale, setActiveLocale] = useState<ContentLocale>(() => initialLocale(article, locale));
  const form = useForm<ArticleFormValues>({
    resolver: zodResolverTranslate(articleFormSchema, t),
    defaultValues: initialValues(article, activeLocale),
  });
  const translations = useWatch({ control: form.control, name: "translations" });
  const written = formLocales(translations);
  const activeWritten = written.includes(activeLocale);

  const create = useCreateArticle();
  const update = useSaveArticle();
  const publish = usePublishArticle();
  const remove = useDeleteArticle();
  const categories = useTaxonomyList("categories");
  const tags = useTaxonomyList("tags");

  const editorRef = useRef<ArticleEditorHandle>(null);
  const [initialBodies] = useState<LocaleBodies>(() => (article ? toBodies(article) : { [activeLocale]: EMPTY_DOC }));
  const [initialBaselines] = useState<Baselines>(() => serializeBodies(initialBodies));
  // Body per language; the editor shows the active one and is remounted on a tab switch.
  const bodiesRef = useRef<LocaleBodies>(initialBodies);
  // The saved body per language, serialized, for dirty checks.
  const baselinesRef = useRef<Baselines>(initialBaselines);
  // What the editor is mounted with; a new `generation` remounts it (tab switch, restore, reload).
  const [editorSeed, setEditorSeed] = useState<{ doc: ArticleDoc; generation: number }>(() => ({
    doc: initialBodies[activeLocale] ?? EMPTY_DOC,
    generation: 0,
  }));
  // A body error path to scroll to once the editor of its language is ready.
  const pendingScrollRef = useRef<string | null>(null);
  const [dirtyBodies, setDirtyBodies] = useState<ContentLocale[]>([]);
  const [editorReady, setEditorReady] = useState(false);
  const [images, setImages] = useState<BodyImageMap>(article?.images ?? {});
  const [coverImage, setCoverImage] = useState<ImageAsset | null>(article?.coverImage ?? null);
  const [stats, setStats] = useState<ArticleEditorStats>({
    words: article?.translations?.[activeLocale]?.wordCount ?? 0,
    characters: 0,
  });
  const [lastSaved, setLastSaved] = useState<string | null>(article?.updatedAt ?? null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "unpublish" | "removeLanguage" | null>(null);
  const [bodyError, setBodyError] = useState<BodyError | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<unknown>(null);

  // Crash recovery (ADR-009 §6): offer a newer local copy once, on open.
  const [restore, setRestore] = useState<LocalDraft | null>(() => {
    const local = readJson<LocalDraft>(draftKey(articleId));
    return shouldOfferRestore(local, article) ? local : null;
  });

  const saving = create.isPending || update.isPending;
  const isDirty = form.formState.isDirty || dirtyBodies.length > 0;
  const status = article?.status ?? "DRAFT";
  const translationErrors = form.formState.errors.translations;
  const attention = written.filter((item) => dirtyBodies.includes(item) || Boolean(translationErrors?.[item]) || bodyError?.locale === item);

  // --- Bodies and dirty state --------------------------------------------------

  function refreshDirtyBodies() {
    const current = formLocales(form.getValues("translations"));
    setDirtyBodies(current.filter((item) => JSON.stringify(bodiesRef.current[item] ?? EMPTY_DOC) !== baselinesRef.current[item]));
  }

  /** Marks the current bodies of every language as saved. */
  function resetBaselines() {
    baselinesRef.current = serializeBodies(bodiesRef.current);
    refreshDirtyBodies();
  }

  /** Remounts the editor with the current body of `target`. */
  function remountEditor(target: ContentLocale) {
    setEditorSeed((seed) => ({ doc: bodiesRef.current[target] ?? EMPTY_DOC, generation: seed.generation + 1 }));
  }

  /** Keeps the active editor's latest body before anything reads `bodiesRef`. */
  function captureActiveBody() {
    const doc = editorRef.current?.getJSON();
    if (doc && activeWritten) bodiesRef.current[activeLocale] = doc;
  }

  // --- Local copy + preview payload (debounced 1 s) -------------------------

  const latest = useRef({ article, images, coverImage, isDirty, activeLocale, categories: categories.data, tags: tags.data });
  useEffect(() => {
    latest.current = { article, images, coverImage, isDirty, activeLocale, categories: categories.data, tags: tags.data };
  });

  const writePreview = useCallback(() => {
    const { article: current, images: map, coverImage: cover, activeLocale: previewLocale, categories: allCategories, tags: allTags } = latest.current;
    const values = form.getValues();
    const category = allCategories?.find((item) => item.id === values.categoryId) ?? current?.category ?? null;
    const translation = values.translations[previewLocale];
    const payload: PreviewPayload = {
      locale: previewLocale,
      title: translation?.title ?? "",
      excerpt: translation?.excerpt ?? "",
      body: bodiesRef.current[previewLocale] ?? EMPTY_DOC,
      images: map,
      coverImage: cover,
      category: category ? { slug: category.slug, name: category.name } : null,
      tags: (allTags ?? current?.tags ?? [])
        .filter((tag) => values.tagIds.includes(tag.id))
        .map((tag) => ({ slug: tag.slug, name: tag.name })),
      at: Date.now(),
    };
    writeJson(previewKey(current?.id), payload);
  }, [form]);

  const timer = useRef<number | null>(null);
  const scheduleLocalCopy = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const { article: current, images: map, isDirty: dirty } = latest.current;
      writePreview();
      if (!dirty) return;
      const values = form.getValues("translations");
      const draft: LocalDraft = {
        translations: Object.fromEntries(
          formLocales(values).map((item) => [item, { title: values[item]?.title ?? "", body: bodiesRef.current[item] ?? EMPTY_DOC }]),
        ),
        savedVersion: current?.version ?? null,
        at: Date.now(),
        images: map,
      };
      writeJson(draftKey(current?.id), draft);
    }, LOCAL_COPY_DELAY);
  }, [form, writePreview]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (editorReady) scheduleLocalCopy();
  }, [translations, isDirty, editorReady, scheduleLocalCopy]);

  // --- Editor callbacks (bound to the language the editor was mounted for) ---

  function handleReady(editorLocale: ContentLocale, doc: ArticleDoc) {
    const current = bodiesRef.current[editorLocale];
    // An unchanged body takes the editor's normalised form as its baseline;
    // one with unsaved edits (restored, or edited on an earlier visit) keeps its baseline.
    if (!current || JSON.stringify(current) === baselinesRef.current[editorLocale] || baselinesRef.current[editorLocale] === undefined) {
      baselinesRef.current[editorLocale] = JSON.stringify(doc);
    }
    bodiesRef.current[editorLocale] = doc;
    setEditorReady(true);
    refreshDirtyBodies();
    const path = pendingScrollRef.current;
    if (path) {
      pendingScrollRef.current = null;
      window.requestAnimationFrame(() => editorRef.current?.scrollToPath(path));
    }
  }

  function handleChange(editorLocale: ContentLocale, doc: ArticleDoc) {
    bodiesRef.current[editorLocale] = doc;
    refreshDirtyBodies();
    setBodyError((current) => (current?.locale === editorLocale ? null : current));
    scheduleLocalCopy();
  }

  // --- Languages -------------------------------------------------------------

  function selectLocale(next: ContentLocale) {
    if (next === activeLocale) return;
    captureActiveBody();
    // The editor of the next language reports its own stats when it mounts.
    setActiveLocale(next);
    remountEditor(next);
  }

  /** Adds the active language, blank or copied from another one as a starting point. */
  function startTranslation(copyFrom: ContentLocale | null) {
    const source = copyFrom ? form.getValues(`translations.${copyFrom}`) : undefined;
    bodiesRef.current[activeLocale] = copyFrom ? structuredClone(bodiesRef.current[copyFrom] ?? EMPTY_DOC) : EMPTY_DOC;
    delete baselinesRef.current[activeLocale];
    form.setValue(
      `translations.${activeLocale}`,
      source ? { ...source } : { ...EMPTY_TRANSLATION_FORM },
      { shouldDirty: true },
    );
    remountEditor(activeLocale);
  }

  function removeTranslation() {
    const others = written.filter((item) => item !== activeLocale);
    if (!others.length) return;
    const next = { ...form.getValues("translations") };
    delete next[activeLocale];
    form.setValue("translations", next, { shouldDirty: true });
    delete bodiesRef.current[activeLocale];
    delete baselinesRef.current[activeLocale];
    setConfirm(null);
    setActiveLocale(others[0]);
    remountEditor(others[0]);
    refreshDirtyBodies();
  }

  // --- Navigation guard (ADR-008 §8) ----------------------------------------

  useEffect(() => {
    setGuard(isDirty, {
      title: t("articles.editor.leaveTitle"),
      description: t("articles.editor.leaveDescription"),
      confirmLabel: t("articles.editor.leaveConfirm"),
      cancelLabel: t("articles.editor.leaveCancel"),
    });
  }, [isDirty, setGuard, t]);
  useEffect(() => () => setGuard(false), [setGuard]);

  // --- Save ------------------------------------------------------------------

  /** Shows a body problem: opens that language's tab and scrolls to the block. */
  function showBodyError(error: BodyError) {
    setBodyError(error);
    if (error.locale !== activeLocale) {
      pendingScrollRef.current = error.path;
      selectLocale(error.locale);
    } else if (error.path) {
      editorRef.current?.scrollToPath(error.path);
    }
  }

  function handleSaveError(error: unknown) {
    const apiError = toApiError(error);
    if (apiError?.status === 409) {
      if (isSlugConflict(error)) {
        form.setError("slug", { type: "server", message: apiError.message });
        setSettingsOpen(true);
      } else {
        setConflictOpen(true);
      }
      return;
    }
    if (apiError?.status === 400) {
      const bodyErrors = bodyFieldErrors(error);
      const unmatched: string[] = [];
      let settingsLocale: ContentLocale | null = null;
      let titleLocale: ContentLocale | null = null;
      for (const { field, message } of apiError.fieldErrors) {
        const split = splitTranslationField(field);
        if (split && (split.field === "body" || split.field.startsWith("body."))) continue;
        if ((SHARED_FORM_FIELDS as readonly string[]).includes(field) || (split && ["title", "excerpt", "metaTitle", "metaDescription"].includes(split.field))) {
          form.setError(field as Parameters<typeof form.setError>[0], { type: "server", message });
          if (split?.field === "title") titleLocale ??= split.locale;
          else if (split) settingsLocale ??= split.locale;
          if (isSettingsField(field)) setSettingsOpen(true);
        } else {
          unmatched.push(field ? `${field}: ${message}` : message);
        }
      }
      if (bodyErrors.length) {
        const first = bodyErrors.find((item) => item.path !== "body") ?? bodyErrors[0];
        showBodyError({ locale: first.locale, message: first.message, path: first.path === "body" ? null : first.path });
      } else if (titleLocale ?? settingsLocale) {
        selectLocale((titleLocale ?? settingsLocale)!);
      }
      if (unmatched.length || (!bodyErrors.length && !apiError.fieldErrors.length)) setSaveError(error);
      return;
    }
    setSaveError(error);
  }

  /**
   * Explicit save (button / Ctrl+S, ADR-009 §6 S8). Creates the article on
   * the first save. `navigate: false` keeps a new article on `/new` so the
   * caller can publish before moving to `/[id]`.
   */
  async function save({ navigate = true }: { navigate?: boolean } = {}): Promise<AdminArticle | null> {
    if (saving) return null;
    setSaveError(null);
    setBodyError(null);
    captureActiveBody();
    const valid = await form.trigger();
    if (!valid) {
      const errors = form.formState.errors;
      const failing = CONTENT_LOCALES.find((item) => errors.translations?.[item]);
      const shared = SHARED_FORM_FIELDS.some((field) => errors[field]);
      if (failing && failing !== activeLocale) selectLocale(failing);
      if (shared || (failing && !errors.translations?.[failing]?.title)) setSettingsOpen(true);
      else form.setFocus(`translations.${failing ?? activeLocale}.title`);
      return null;
    }
    const values = form.getValues();
    for (const item of formLocales(values.translations)) {
      const check = validateDoc(bodiesRef.current[item] ?? EMPTY_DOC);
      if (!check.ok) {
        const issue = check.issues.find((entry) => entry.path !== "body") ?? check.issues[0];
        showBodyError({ locale: item, message: issue.message, path: issue.path === "body" ? null : issue.path });
        return null;
      }
    }
    try {
      const input = toArticleInput(values, bodiesRef.current, article?.version);
      const saved = article ? await update.mutateAsync({ id: article.id, body: input }) : await create.mutateAsync(input);
      form.reset(toFormValues(saved));
      resetBaselines();
      setImages((current) => ({ ...current, ...saved.images }));
      setCoverImage(saved.coverImage);
      setLastSaved(saved.updatedAt);
      removeKey(draftKey(article?.id));
      setRestore(null);
      if (saved.revalidation?.status === "PENDING_RETRY") {
        pushToast({ variant: "error", title: { key: "admin:articles.toast.revalidationPending" } });
      }
      if (!article && navigate) {
        setGuard(false);
        router.replace(`/admin/articles/${saved.id}`);
      }
      return saved;
    } catch (error) {
      handleSaveError(error);
      return null;
    }
  }

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  const saveShortcut = useCallback(() => void saveRef.current(), []);

  // Ctrl/Cmd+S anywhere on the page (the editor handles it itself when focused).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      void saveRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Conflict, restore, publish, delete ------------------------------------

  async function reloadFromServer() {
    if (!article) return;
    setReloading(true);
    try {
      const fresh = await queryClient.fetchQuery({ ...articleQuery(article.id), staleTime: 0 });
      form.reset(toFormValues(fresh));
      bodiesRef.current = toBodies(fresh);
      baselinesRef.current = serializeBodies(bodiesRef.current);
      const freshLocales = sortLocales(Object.keys(fresh.translations ?? {}));
      const shown = !freshLocales.includes(activeLocale) && freshLocales.length ? freshLocales[0] : activeLocale;
      setActiveLocale(shown);
      remountEditor(shown);
      setImages((current) => ({ ...current, ...fresh.images }));
      setCoverImage(fresh.coverImage);
      setLastSaved(fresh.updatedAt);
      refreshDirtyBodies();
      removeKey(draftKey(article.id));
      setRestore(null);
      setConflictOpen(false);
    } catch (error) {
      pushToast({ variant: "error", title: { key: "admin:articles.toast.reloadFailed" }, description: getApiErrorMessage(error, "") || undefined });
    } finally {
      setReloading(false);
    }
  }

  async function copyAndReload() {
    captureActiveBody();
    const content = JSON.stringify({ ...form.getValues(), bodies: bodiesRef.current }, null, 2);
    try {
      await navigator.clipboard.writeText(content);
      pushToast({ variant: "success", title: { key: "admin:articles.toast.copied" } });
    } catch {
      pushToast({ variant: "error", title: { key: "admin:articles.toast.copyFailed" } });
      return;
    }
    await reloadFromServer();
  }

  function restoreLocal() {
    if (!restore) return;
    if (restore.images) setImages((current) => ({ ...current, ...restore.images }));
    for (const item of CONTENT_LOCALES) {
      const local = restore.translations[item];
      if (!local) continue;
      bodiesRef.current[item] = local.body;
      if (form.getValues(`translations.${item}`)) {
        form.setValue(`translations.${item}.title`, local.title, { shouldDirty: true });
      } else {
        form.setValue(`translations.${item}`, { ...EMPTY_TRANSLATION_FORM, title: local.title }, { shouldDirty: true });
      }
    }
    remountEditor(activeLocale);
    refreshDirtyBodies();
    setRestore(null);
  }

  function discardLocal() {
    removeKey(draftKey(articleId));
    setRestore(null);
  }

  function openChecklist() {
    captureActiveBody();
    const values = form.getValues();
    const fallbackTitle = values.translations[formLocales(values.translations)[0]]?.title ?? "";
    setChecklist(
      publishChecklist({
        ...values,
        // A new article gets its slug from the title on first save.
        slug: values.slug || article?.slug || slugify(fallbackTitle),
        images,
        translations: formLocales(values.translations).map((item) => ({
          locale: item,
          title: values.translations[item]?.title ?? "",
          excerpt: values.translations[item]?.excerpt ?? "",
          metaDescription: values.translations[item]?.metaDescription ?? "",
          body: bodiesRef.current[item] ?? EMPTY_DOC,
        })),
      }),
    );
    setPublishError(null);
    setChecklistOpen(true);
  }

  async function publishNow() {
    setPublishing(true);
    setPublishError(null);
    try {
      let target = article;
      if (!target || isDirty) {
        target = await save({ navigate: false });
        if (!target) {
          setChecklistOpen(false);
          return;
        }
      }
      const updated = await publish.mutateAsync({ id: target.id, publish: true });
      setChecklistOpen(false);
      pushToast({
        variant: updated.revalidation?.status === "PENDING_RETRY" ? "error" : "success",
        title: { key: updated.revalidation?.status === "PENDING_RETRY" ? "admin:articles.toast.revalidationPending" : "admin:articles.toast.published" },
      });
      if (!article) {
        setGuard(false);
        router.replace(`/admin/articles/${updated.id}`);
      }
    } catch (error) {
      setPublishError(error);
    } finally {
      setPublishing(false);
    }
  }

  async function unpublishNow() {
    if (!article) return;
    try {
      const updated = await publish.mutateAsync({ id: article.id, publish: false });
      setConfirm(null);
      pushToast({
        variant: updated.revalidation?.status === "PENDING_RETRY" ? "error" : "success",
        title: { key: updated.revalidation?.status === "PENDING_RETRY" ? "admin:articles.toast.revalidationPending" : "admin:articles.toast.unpublished" },
      });
    } catch (error) {
      setConfirm(null);
      pushToast({ variant: "error", title: { key: "admin:articles.toast.unpublishFailed" }, description: getApiErrorMessage(error, "") || undefined });
    }
  }

  function deleteNow() {
    if (!article) return;
    remove.mutate(article.id, {
      onSuccess: () => {
        setConfirm(null);
        setGuard(false);
        removeKey(draftKey(article.id));
        removeKey(previewKey(article.id));
        router.push("/admin/articles");
      },
    });
  }

  // --- Render ----------------------------------------------------------------

  const saveState = saving
    ? t("articles.editor.saving")
    : isDirty
      ? t("articles.editor.unsaved")
      : article && lastSaved
        ? t("articles.editor.savedAt", { time: formatTime(lastSaved, { locale }) })
        : t("articles.editor.notSaved");
  const titleError = translationErrors?.[activeLocale]?.title?.message;
  const activeLanguage = languageName(activeLocale, locale);

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-14 z-20 flex h-14 items-center gap-2 overflow-x-auto border-b bg-background/95 px-4 backdrop-blur lg:px-6">
        <GuardedLink
          href="/admin/articles"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="hidden sm:inline">{t("articles.title")}</span>
          <span className="sr-only sm:hidden">{t("articles.editor.back")}</span>
        </GuardedLink>
        {article ? <ArticleStatusBadge status={status} /> : <Badge variant="secondary">{t("articles.editor.new")}</Badge>}
        <span
          className={cn("shrink-0 text-xs whitespace-nowrap", isDirty && !saving ? "text-warning" : "text-muted-foreground")}
          role="status"
          aria-live="polite"
        >
          {saveState}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Link
            href={`/admin/articles/${article?.id ?? "new"}/preview?lang=${activeLocale}`}
            target="_blank"
            rel="noopener"
            onClick={() => {
              captureActiveBody();
              writePreview();
            }}
            aria-label={t("articles.preview")}
            className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm hover:bg-muted"
          >
            <Eye className="size-4" aria-hidden />
            <span className="hidden md:inline">{t("articles.preview")}</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setSettingsOpen(true)} aria-label={t("articles.settings.title")}>
            <Settings2 aria-hidden />
            <span className="hidden md:inline">{t("articles.editor.settings")}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void save()} loading={saving} aria-label={t("articles.editor.save")}>
            {saving ? null : <Save aria-hidden />}
            <span className="hidden sm:inline">{t("articles.editor.save")}</span>
          </Button>
          {status === "PUBLISHED" ? (
            <Button variant="secondary" size="sm" onClick={() => setConfirm("unpublish")} disabled={publish.isPending} aria-label={t("articles.unpublish")}>
              <EyeOff aria-hidden />
              <span className="hidden sm:inline">{t("articles.unpublish")}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={openChecklist}
              disabled={!editorReady}
              aria-label={t("articles.publish")}
            >
              <Send aria-hidden />
              <span className="hidden sm:inline">{t("articles.publish")}</span>
            </Button>
          )}
          {article || written.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("moreActions", { ns: "common" })} />}>
                <Ellipsis aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeWritten && written.length > 1 ? (
                  <DropdownMenuItem onClick={() => setConfirm("removeLanguage")}>
                    <Languages aria-hidden /> {t("articles.languages.remove", { language: activeLanguage })}
                  </DropdownMenuItem>
                ) : null}
                {article && activeWritten && written.length > 1 ? <DropdownMenuSeparator /> : null}
                {article ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      remove.reset();
                      setConfirm("delete");
                    }}
                  >
                    <Trash2 aria-hidden /> {t("delete", { ns: "common" })}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6 sm:px-6">
        <LanguageTabs active={activeLocale} written={written} attention={attention} onSelect={selectLocale} uiLocale={locale} />
        {restore && editorReady ? (
          <InlineAlert variant="info" title={t("articles.editor.restoreTitle")}>
            <p>{t("articles.editor.restoreDescription", { time: formatTime(new Date(restore.at), { locale }) })}</p>
            <div className="mt-2 flex gap-2">
              <Button size="xs" onClick={restoreLocal}>
                {t("articles.editor.restore")}
              </Button>
              <Button size="xs" variant="outline" onClick={discardLocal}>
                {t("articles.editor.discard")}
              </Button>
            </div>
          </InlineAlert>
        ) : null}
        {bodyError ? (
          <InlineAlert title={t("articles.editor.bodyInvalid")}>
            <p>
              {bodyError.locale !== activeLocale ? `${languageName(bodyError.locale, locale)}: ` : null}
              {bodyError.message}
            </p>
            {bodyError.path ? (
              <Button size="xs" variant="outline" className="mt-2" onClick={() => showBodyError(bodyError)}>
                {t("articles.editor.goToBlock")}
              </Button>
            ) : null}
          </InlineAlert>
        ) : null}
        {saveError ? <ApiErrorAlert error={saveError} title={t("articles.editor.saveFailed")} /> : null}

        {activeWritten ? (
          <ArticleEditor
            key={`${activeLocale}:${editorSeed.generation}`}
            initialContent={editorSeed.doc}
            images={images}
            onImagesChange={setImages}
            onChange={(doc) => handleChange(activeLocale, doc)}
            onReady={(doc) => handleReady(activeLocale, doc)}
            onStats={setStats}
            onSaveShortcut={saveShortcut}
            editorRef={editorRef}
            beforeContent={
              <div className="mb-6" lang={activeLocale}>
                <textarea
                  key={activeLocale}
                  {...form.register(`translations.${activeLocale}.title`)}
                  rows={1}
                  maxLength={200}
                  placeholder={t("articles.editor.titlePlaceholder")}
                  aria-label={`${t("articles.editor.titleLabel")} (${activeLanguage})`}
                  aria-invalid={Boolean(titleError) || undefined}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      editorRef.current?.focus();
                    }
                  }}
                  className="field-sizing-content w-full resize-none bg-transparent text-3xl leading-tight font-semibold tracking-tight outline-none placeholder:text-muted-foreground/60 sm:text-4xl"
                />
                {titleError ? <p className="mt-1 text-sm text-destructive">{titleError}</p> : null}
              </div>
            }
          />
        ) : (
          <StartTranslationPanel locale={activeLocale} sources={written} onStart={startTranslation} uiLocale={locale} />
        )}
      </div>

      <footer className="sticky bottom-0 z-10 border-t bg-background/95 px-4 py-2 text-xs text-muted-foreground backdrop-blur lg:px-6">
        {activeLanguage} · {t("articles.editor.words", { count: activeWritten ? stats.words : 0 })} ·{" "}
        {t("articles.editor.readingTime", { count: readingMinutes(activeWritten ? stats.words : 0) })}
      </footer>

      <ArticleSettingsSheet
        form={form}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        coverImage={coverImage}
        onCoverChange={setCoverImage}
        locale={locale}
        activeLocale={activeWritten ? activeLocale : null}
      />
      <PublishChecklistDialog
        open={checklistOpen}
        onOpenChange={setChecklistOpen}
        items={checklist}
        onPublish={() => void publishNow()}
        onOpenSettings={() => {
          setChecklistOpen(false);
          setSettingsOpen(true);
        }}
        publishing={publishing}
        error={publishError}
        hasUnsavedChanges={isDirty || !article}
        uiLocale={locale}
      />
      <VersionConflictDialog
        open={conflictOpen}
        onReload={() => void reloadFromServer()}
        onCopyAndReload={() => void copyAndReload()}
        reloading={reloading}
      />
      <ConfirmDialog
        open={confirm === "unpublish"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("articles.editor.unpublishTitle")}
        description={t("articles.editor.unpublishDescription")}
        confirmLabel={t("articles.unpublish")}
        loading={publish.isPending}
        onConfirm={() => void unpublishNow()}
      />
      <ConfirmDialog
        open={confirm === "removeLanguage"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("articles.languages.removeTitle", { language: activeLanguage })}
        description={t("articles.languages.removeDescription", { language: activeLanguage })}
        destructive
        confirmLabel={t("articles.languages.removeConfirm")}
        onConfirm={removeTranslation}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("articles.deleteTitle", { title: article?.title })}
        description={status === "PUBLISHED" ? t("articles.deletePublished") : t("articles.deleteDraft")}
        destructive
        confirmLabel={t("delete", { ns: "common" })}
        loading={remove.isPending}
        onConfirm={deleteNow}
      >
        {remove.error ? <ApiErrorAlert error={remove.error} /> : null}
      </ConfirmDialog>
    </div>
  );
}
