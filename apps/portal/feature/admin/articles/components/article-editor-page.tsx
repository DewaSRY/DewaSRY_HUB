"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Ellipsis, Eye, EyeOff, Save, Send, Settings2, Trash2 } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { InlineAlert } from "@/components/common/inline-alert";
import { PageContainer } from "@/components/common/page-header";
import { QueryErrorState } from "@/components/common/query-error-state";
import { GuardedLink } from "@/components/common/navigation-guard/guarded-link";
import { useNavigationGuardStore } from "@/components/common/navigation-guard/store";
import { applyApiFieldErrors, getApiErrorMessage, toApiError } from "@/lib/api/error";
import { formatTime } from "@/lib/datetime";
import { zodResolverTranslate } from "@/lib/form";
import { pushToast } from "@/lib/toast/store";
import { cn, slugify } from "@/lib/utils";
import { EMPTY_DOC, readingMinutes, validateDoc, type ArticleDoc, type BodyImageMap, type ImageAsset } from "@/feature/content";
import { useTaxonomyList } from "@/feature/admin/taxonomy";
import { useAdminArticle, useCreateArticle, useDeleteArticle, usePublishArticle, useSaveArticle } from "../hooks";
import { articleQuery } from "../queries";
import { ARTICLE_FORM_FIELDS, articleFormSchema, type ArticleFormValues } from "../schema";
import type { AdminArticle } from "../type";
import {
  SETTINGS_FIELDS,
  bodyFieldErrors,
  draftKey,
  isSlugConflict,
  previewKey,
  publishChecklist,
  readJson,
  removeKey,
  shouldOfferRestore,
  toArticleInput,
  toFormValues,
  writeJson,
  type ChecklistItem,
  type LocalDraft,
  type PreviewPayload,
} from "../utils";
import type { ArticleEditorHandle, ArticleEditorStats } from "../editor/types";
import { ArticleSettingsSheet } from "./article-settings-sheet";
import { ArticleStatusBadge } from "./articles-screen";
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
  message: string;
  path: string | null;
}

function ArticleEditorForm({ article }: { article: AdminArticle | null }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setGuard = useNavigationGuardStore((state) => state.setGuard);
  const articleId = article?.id ?? null;

  const form = useForm<ArticleFormValues>({
    resolver: zodResolverTranslate(articleFormSchema, t),
    defaultValues: toFormValues(article),
  });
  const title = useWatch({ control: form.control, name: "title" });

  const create = useCreateArticle();
  const update = useSaveArticle();
  const publish = usePublishArticle();
  const remove = useDeleteArticle();
  const categories = useTaxonomyList("categories");
  const tags = useTaxonomyList("tags");

  const editorRef = useRef<ArticleEditorHandle>(null);
  const bodyRef = useRef<ArticleDoc>(article?.body ?? EMPTY_DOC);
  const baselineRef = useRef<string>(JSON.stringify(article?.body ?? EMPTY_DOC));
  const [bodyDirty, setBodyDirty] = useState(false);
  const [editorReady, setEditorReady] = useState(false);
  const [images, setImages] = useState<BodyImageMap>(article?.images ?? {});
  const [coverImage, setCoverImage] = useState<ImageAsset | null>(article?.coverImage ?? null);
  const [stats, setStats] = useState<ArticleEditorStats>({ words: article?.wordCount ?? 0, characters: 0 });
  const [lastSaved, setLastSaved] = useState<string | null>(article?.updatedAt ?? null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [confirm, setConfirm] = useState<"delete" | "unpublish" | null>(null);
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
  const isDirty = form.formState.isDirty || bodyDirty;
  const status = article?.status ?? "DRAFT";

  // --- Local copy + preview payload (debounced 1 s) -------------------------

  const latest = useRef({ article, images, coverImage, isDirty, categories: categories.data, tags: tags.data });
  useEffect(() => {
    latest.current = { article, images, coverImage, isDirty, categories: categories.data, tags: tags.data };
  });

  const writePreview = useCallback(() => {
    const { article: current, images: map, coverImage: cover, categories: allCategories, tags: allTags } = latest.current;
    const values = form.getValues();
    const category = allCategories?.find((item) => item.id === values.categoryId) ?? current?.category ?? null;
    const payload: PreviewPayload = {
      title: values.title,
      excerpt: values.excerpt,
      body: bodyRef.current,
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
      const draft: LocalDraft = {
        body: bodyRef.current,
        title: form.getValues("title"),
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
  }, [title, isDirty, editorReady, scheduleLocalCopy]);

  // --- Editor callbacks ------------------------------------------------------

  const handleReady = useCallback((doc: ArticleDoc) => {
    bodyRef.current = doc;
    baselineRef.current = JSON.stringify(doc);
    setEditorReady(true);
  }, []);

  const handleChange = useCallback(
    (doc: ArticleDoc) => {
      bodyRef.current = doc;
      setBodyDirty(JSON.stringify(doc) !== baselineRef.current);
      setBodyError(null);
      scheduleLocalCopy();
    },
    [scheduleLocalCopy],
  );

  /** Marks the current editor content as saved (after a save or reload). */
  function resetBaseline(doc: ArticleDoc) {
    baselineRef.current = JSON.stringify(doc);
    setBodyDirty(JSON.stringify(bodyRef.current) !== baselineRef.current);
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
      const unmatched = applyApiFieldErrors(error, form.setError, ARTICLE_FORM_FIELDS).filter(
        (message) => !message.startsWith("body"),
      );
      if (apiError.fieldErrors.some((item) => (SETTINGS_FIELDS as readonly string[]).includes(item.field))) setSettingsOpen(true);
      if (bodyErrors.length) {
        const first = bodyErrors.find((item) => item.path !== "body") ?? bodyErrors[0];
        setBodyError({ message: first.message, path: first.path === "body" ? null : first.path });
        if (first.path !== "body") editorRef.current?.scrollToPath(first.path);
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
    const valid = await form.trigger();
    if (!valid) {
      const errors = form.formState.errors;
      if (SETTINGS_FIELDS.some((field) => errors[field])) setSettingsOpen(true);
      else form.setFocus("title");
      return null;
    }
    const body = editorRef.current?.getJSON() ?? bodyRef.current;
    const check = validateDoc(body);
    if (!check.ok) {
      const issue = check.issues.find((item) => item.path !== "body") ?? check.issues[0];
      setBodyError({ message: issue.message, path: issue.path === "body" ? null : issue.path });
      if (issue.path !== "body") editorRef.current?.scrollToPath(issue.path);
      return null;
    }
    const values = form.getValues();
    try {
      const saved = article
        ? await update.mutateAsync({ id: article.id, body: toArticleInput(values, body, article.version) })
        : await create.mutateAsync(toArticleInput(values, body));
      form.reset(toFormValues(saved));
      resetBaseline(body);
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
      setImages((current) => ({ ...current, ...fresh.images }));
      setCoverImage(fresh.coverImage);
      setLastSaved(fresh.updatedAt);
      editorRef.current?.setContent(fresh.body);
      resetBaseline(editorRef.current?.getJSON() ?? fresh.body);
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
    const content = JSON.stringify({ ...form.getValues(), body: editorRef.current?.getJSON() ?? bodyRef.current }, null, 2);
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
    editorRef.current?.setContent(restore.body);
    form.setValue("title", restore.title, { shouldDirty: true });
    setRestore(null);
  }

  function discardLocal() {
    removeKey(draftKey(articleId));
    setRestore(null);
  }

  function openChecklist() {
    const values = form.getValues();
    setChecklist(
      publishChecklist({
        ...values,
        // A new article gets its slug from the title on first save.
        slug: values.slug || article?.slug || slugify(values.title),
        body: editorRef.current?.getJSON() ?? bodyRef.current,
        images,
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
  const titleError = form.formState.errors.title?.message;

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
            href={`/admin/articles/${article?.id ?? "new"}/preview`}
            target="_blank"
            rel="noopener"
            onClick={writePreview}
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
          {article ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("moreActions", { ns: "common" })} />}>
                <Ellipsis aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    remove.reset();
                    setConfirm("delete");
                  }}
                >
                  <Trash2 aria-hidden /> {t("delete", { ns: "common" })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex-1 space-y-4 px-4 py-6 sm:px-6">
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
            <p>{bodyError.message}</p>
            {bodyError.path ? (
              <Button size="xs" variant="outline" className="mt-2" onClick={() => editorRef.current?.scrollToPath(bodyError.path!)}>
                {t("articles.editor.goToBlock")}
              </Button>
            ) : null}
          </InlineAlert>
        ) : null}
        {saveError ? <ApiErrorAlert error={saveError} title={t("articles.editor.saveFailed")} /> : null}

        <ArticleEditor
          initialContent={article?.body ?? EMPTY_DOC}
          images={images}
          onImagesChange={setImages}
          onChange={handleChange}
          onReady={handleReady}
          onStats={setStats}
          onSaveShortcut={saveShortcut}
          editorRef={editorRef}
          beforeContent={
            <div className="mb-6">
              <textarea
                {...form.register("title")}
                rows={1}
                maxLength={200}
                placeholder={t("articles.editor.titlePlaceholder")}
                aria-label={t("articles.editor.titleLabel")}
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
      </div>

      <footer className="sticky bottom-0 z-10 border-t bg-background/95 px-4 py-2 text-xs text-muted-foreground backdrop-blur lg:px-6">
        {t("articles.editor.words", { count: stats.words })} · {t("articles.editor.readingTime", { count: readingMinutes(stats.words) })}
      </footer>

      <ArticleSettingsSheet
        form={form}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        coverImage={coverImage}
        onCoverChange={setCoverImage}
        locale={locale}
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
