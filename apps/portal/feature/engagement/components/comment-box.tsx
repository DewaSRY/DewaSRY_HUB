"use client";

import { useEffect, useImperativeHandle, useRef, useState, type BaseSyntheticEvent, type KeyboardEvent, type Ref } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { EyeOff, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useNavigationGuardStore } from "@/components/common/navigation-guard/store";
import { getApiErrorMessage, getApiFieldErrors, getApiStatus } from "@/lib/api/error";
import { zodResolverTranslate } from "@/lib/form";
import { useDebounce } from "@/hooks/use-debounce";
import { useDeleteCommentMutation, useMentionSearch, useSaveCommentMutation } from "../hooks";
import { commentSchema, type CommentFormValues } from "../schema";
import { COMMENT_MAX_LENGTH, MAX_MENTIONS, type MyComment, type UserMini } from "../type";
import {
  activeMentionQuery,
  codePointLength,
  insertMention,
  mentionLabel,
  mentionedIds,
  toCommentBody,
  toEditableText,
  type PickedMentions,
} from "../utils";
import { CommentItem, UserAvatar } from "./comment-item";
import { MENTION_LISTBOX_ID, MentionPicker, mentionOptionId } from "./mention-picker";

export type Viewer = "loading" | "visitor" | "user";

export interface CommentBoxHandle {
  /** Focus the textarea and bring it into view (after sign-in, ADR-010 §8.3). */
  focus: () => void;
}

type Notice = { kind: "conflict" } | { kind: "error"; message: string } | null;

const TEXTAREA_ID = "comment-text";

/**
 * The caller's one comment (UC-24, UC-25): write it, edit it, or delete it.
 * While it holds unsent text, the navigation guard is armed (R4, ADR-010 §8.4).
 */
export function CommentBox({
  ref,
  articleId,
  slug,
  viewer,
  profile,
  mine,
  mineLoading,
  onRequireSignIn,
  onConflict,
}: {
  ref?: Ref<CommentBoxHandle>;
  articleId: string;
  slug: string;
  viewer: Viewer;
  profile: Pick<UserMini, "name" | "avatarUrl"> | null;
  mine: MyComment | null;
  mineLoading: boolean;
  onRequireSignIn: () => void;
  /** Reload the caller's comment after a 409; resolves with the fresh copy. */
  onConflict: () => Promise<MyComment | null>;
}) {
  const { t } = useTranslation("engagement");
  const save = useSaveCommentMutation(slug, articleId);
  const remove = useDeleteCommentMutation(slug, articleId);
  const setGuard = useNavigationGuardStore((state) => state.setGuard);

  const form = useForm<CommentFormValues>({
    resolver: zodResolverTranslate(commentSchema, (key, params) => t(key, params)),
    defaultValues: { text: "" },
  });
  const text = useWatch({ control: form.control, name: "text" });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const pickedRef = useRef<PickedMentions>({});
  const [editing, setEditing] = useState(false);
  const [baselineText, setBaselineText] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [caret, setCaret] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const hidden = mine?.status === "HIDDEN";
  const composing = viewer === "user" && !mineLoading && (!mine || (editing && !hidden));
  const isDirty = composing && text.trim() !== baselineText.trim();

  // R4: warn before leaving with an unsent comment.
  useEffect(() => {
    setGuard(
      isDirty,
      isDirty
        ? {
            title: t("guard.title"),
            description: t("guard.description"),
            confirmLabel: t("guard.discard"),
            cancelLabel: t("guard.keepEditing"),
          }
        : undefined,
    );
  }, [isDirty, setGuard, t]);
  useEffect(() => () => setGuard(false), [setGuard]);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const node = textareaRef.current;
      if (!node) return;
      node.scrollIntoView({ block: "center", behavior: "smooth" });
      node.focus({ preventScroll: true });
    },
  }));

  // ---- Mentions -------------------------------------------------------------------------------
  const mention = composing ? activeMentionQuery(text, caret) : null;
  const pickerOpen = mention !== null && mention.start !== dismissedAt;
  const debouncedQuery = useDebounce(mention?.query ?? "", 250);
  const search = useMentionSearch(debouncedQuery, pickerOpen);
  const suggestions = pickerOpen && debouncedQuery === mention?.query ? (search.data ?? []) : [];
  const suggestionIndex = Math.min(activeIndex, Math.max(0, suggestions.length - 1));

  function syncCaret(node: HTMLTextAreaElement) {
    setCaret(node.selectionStart ?? node.value.length);
  }

  function pick(user: UserMini) {
    if (!mention) return;
    const next = insertMention(text, mention.start, caret, user.name);
    pickedRef.current = { ...pickedRef.current, [mentionLabel(user.name)]: user.id };
    form.setValue("text", next.text, { shouldDirty: true, shouldValidate: form.formState.isSubmitted });
    setCaret(next.caret);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(next.caret, next.caret);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (pickerOpen && suggestions.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((suggestionIndex + step + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pick(suggestions[suggestionIndex]);
        return;
      }
    }
    if (pickerOpen && event.key === "Escape") {
      event.preventDefault();
      setDismissedAt(mention!.start);
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  }

  // ---- Actions --------------------------------------------------------------------------------
  function resetComposer() {
    setGuard(false);
    setEditing(false);
    setBaselineText("");
    setNotice(null);
    pickedRef.current = {};
    form.reset({ text: "" });
  }

  function startEdit() {
    if (!mine) return;
    const editable = toEditableText(mine.body, mine.mentions);
    pickedRef.current = { ...editable.picked };
    setBaselineText(editable.text);
    setNotice(null);
    form.reset({ text: editable.text });
    setEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function saveComment({ text: value }: CommentFormValues) {
    setNotice(null);
    if (mentionedIds(value, pickedRef.current).length > MAX_MENTIONS) {
      form.setError("text", { type: "mentions", message: t("comment.mentionLimit", { max: MAX_MENTIONS }) });
      return;
    }
    const body = toCommentBody(value, pickedRef.current);
    try {
      await save.mutateAsync({ body, version: mine ? mine.version : undefined });
      resetComposer();
    } catch (error) {
      const status = getApiStatus(error);
      if (status === 409) {
        // Changed or created in another tab, or hidden by the moderator: reload and keep the text.
        const fresh = await onConflict();
        if (fresh && fresh.status === "VISIBLE") {
          setEditing(true);
          setNotice({ kind: "conflict" });
        }
        return;
      }
      const bodyError = status === 400 ? getApiFieldErrors(error)?.body : undefined;
      if (bodyError) form.setError("text", { type: "server", message: bodyError });
      else setNotice({ kind: "error", message: getApiErrorMessage(error, t("comment.saveFailed")) });
    }
  }

  // Built per event (not during render): `handleSubmit` only wraps the handler.
  const submit = (event?: BaseSyntheticEvent) => form.handleSubmit(saveComment)(event);

  // ---- Render ---------------------------------------------------------------------------------
  if (viewer === "loading" || (viewer === "user" && mineLoading)) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  if (viewer === "user" && mine && !composing) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <CommentItem
          comment={mine}
          badge={<Badge variant="secondary">{t("comments.yours")}</Badge>}
          actions={
            hidden ? (
              <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                <EyeOff className="mt-0.5 size-4 shrink-0" aria-hidden />
                {t("comment.hidden")}
              </p>
            ) : (
              <div className="mt-2 flex gap-1">
                <Button size="xs" variant="ghost" onClick={startEdit}>
                  <Pencil aria-hidden />
                  {t("comment.edit")}
                </Button>
                <Button size="xs" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 aria-hidden />
                  {t("comment.delete")}
                </Button>
              </div>
            )
          }
        />
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={t("comment.deleteTitle")}
          description={t("comment.deleteDescription")}
          confirmLabel={t("comment.deleteConfirm")}
          destructive
          loading={remove.isPending}
          onConfirm={() =>
            remove.mutate(undefined, {
              onSuccess: () => {
                setConfirmDelete(false);
                resetComposer();
              },
              onError: () => setConfirmDelete(false),
            })
          }
        />
      </div>
    );
  }

  const visitor = viewer === "visitor";
  const length = codePointLength(text);
  const fieldError = form.formState.errors.text?.message;

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border bg-card p-3 sm:p-4">
      <div className="flex gap-3">
        <div className="hidden pt-1 sm:block">
          <UserAvatar user={profile ?? { name: "?", avatarUrl: null }} />
        </div>
        <div className="relative min-w-0 flex-1">
          <label htmlFor={TEXTAREA_ID} className="sr-only">
            {t("comment.label")}
          </label>
          <Controller
            control={form.control}
            name="text"
            render={({ field }) => (
              <Textarea
                {...field}
                ref={(node) => {
                  field.ref(node);
                  textareaRef.current = node;
                }}
                id={TEXTAREA_ID}
                rows={3}
                readOnly={visitor}
                placeholder={visitor ? t("comment.placeholderVisitor") : t("comment.placeholder")}
                aria-invalid={fieldError ? true : undefined}
                aria-describedby={fieldError ? `${TEXTAREA_ID}-error` : undefined}
                role={visitor ? undefined : "combobox"}
                aria-autocomplete={visitor ? undefined : "list"}
                aria-expanded={visitor ? undefined : pickerOpen}
                aria-controls={pickerOpen ? MENTION_LISTBOX_ID : undefined}
                aria-activedescendant={pickerOpen && suggestions.length ? mentionOptionId(suggestionIndex) : undefined}
                className="min-h-24 resize-y border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
                onClick={(event) => (visitor ? onRequireSignIn() : syncCaret(event.currentTarget))}
                onKeyDown={(event) => {
                  if (visitor) {
                    if (event.key.length === 1 || event.key === "Enter") {
                      event.preventDefault();
                      onRequireSignIn();
                    }
                    return;
                  }
                  handleKeyDown(event);
                }}
                onKeyUp={(event) => {
                  if (!visitor && !["ArrowDown", "ArrowUp", "Enter", "Tab", "Escape"].includes(event.key)) syncCaret(event.currentTarget);
                }}
                onChange={(event) => {
                  field.onChange(event);
                  syncCaret(event.currentTarget);
                  setActiveIndex(0);
                  setDismissedAt(null);
                }}
              />
            )}
          />
          {pickerOpen ? (
            <MentionPicker
              users={suggestions}
              loading={search.isFetching || debouncedQuery !== mention?.query}
              activeIndex={suggestionIndex}
              onPick={pick}
              onHover={setActiveIndex}
            />
          ) : null}
        </div>
      </div>

      {fieldError ? (
        <p id={`${TEXTAREA_ID}-error`} role="alert" className="text-sm text-destructive">
          {fieldError}
        </p>
      ) : null}
      {notice ? (
        <p role="alert" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
          {notice.kind === "conflict" ? t("comment.conflict") : notice.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <p className="text-xs text-muted-foreground">{t("comment.oneComment")}</p>
        <div className="flex items-center gap-2">
          {!visitor ? (
            <span className={length > COMMENT_MAX_LENGTH ? "text-xs text-destructive tabular-nums" : "text-xs text-muted-foreground tabular-nums"}>
              {t("comment.counter", { count: length, max: COMMENT_MAX_LENGTH })}
            </span>
          ) : null}
          {editing ? (
            <Button type="button" variant="ghost" size="sm" onClick={resetComposer} disabled={save.isPending}>
              {t("comment.cancel")}
            </Button>
          ) : null}
          <Button
            type={visitor ? "button" : "submit"}
            size="sm"
            loading={save.isPending}
            onClick={visitor ? onRequireSignIn : undefined}
          >
            {editing ? t("comment.save") : t("comment.post")}
          </Button>
        </div>
      </div>
    </form>
  );
}
