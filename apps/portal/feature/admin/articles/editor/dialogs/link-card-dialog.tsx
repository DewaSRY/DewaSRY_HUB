"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { LIMITS, isHttpsUrl } from "@/feature/content";
import { useLinkPreview } from "../../hooks";
import type { BookmarkAttrs } from "../context";
import { withProtocol } from "../utils";

/**
 * Link card (ADR-009 §5.5): paste an https URL, fetch its title,
 * description, and site name with `POST /admin/link-preview`, edit them,
 * and insert a `bookmark` block. No remote image is ever stored.
 */
export function LinkCardDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: BookmarkAttrs | null;
  onSubmit: (attrs: BookmarkAttrs) => void;
}) {
  const { t } = useTranslation("admin");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("editor.bookmark.title")}</DialogTitle>
          <DialogDescription>{t("editor.bookmark.description")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <LinkCardForm
            key={initial?.url ?? "new"}
            initial={initial}
            onCancel={() => onOpenChange(false)}
            onSubmit={(attrs) => {
              onSubmit(attrs);
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LinkCardForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: BookmarkAttrs | null;
  onCancel: () => void;
  onSubmit: (attrs: BookmarkAttrs) => void;
}) {
  const { t } = useTranslation("admin");
  const id = useId();
  const preview = useLinkPreview();
  const [url, setUrl] = useState(initial?.url ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [siteName, setSiteName] = useState(initial?.siteName ?? "");
  const [fetchedFor, setFetchedFor] = useState<string | null>(initial?.url ?? null);
  const normalized = withProtocol(url);
  const valid = isHttpsUrl(normalized);

  function fetchDetails() {
    if (!valid) return;
    preview.mutate(normalized, {
      onSuccess: (data) => {
        setFetchedFor(normalized);
        setUrl(data.url || normalized);
        setTitle((data.title ?? "").slice(0, LIMITS.maxBookmarkText));
        setDescription((data.description ?? "").slice(0, LIMITS.maxBookmarkText));
        setSiteName((data.siteName ?? "").slice(0, 200));
      },
    });
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onSubmit({
          url: normalized,
          title: title.trim() || null,
          description: description.trim() || null,
          siteName: siteName.trim() || null,
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-url`}>{t("editor.bookmark.url")}</Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-url`}
            autoFocus
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onBlur={() => {
              if (valid && fetchedFor !== normalized && !preview.isPending) fetchDetails();
            }}
            placeholder="https://"
            aria-invalid={(Boolean(url.trim()) && !valid) || undefined}
          />
          <Button type="button" variant="outline" onClick={fetchDetails} disabled={!valid} loading={preview.isPending}>
            <Sparkles aria-hidden />
            {t("editor.bookmark.fetch")}
          </Button>
        </div>
        <p className={url.trim() && !valid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {url.trim() && !valid ? t("editor.bookmark.httpsOnly") : t("editor.bookmark.hint")}
        </p>
      </div>
      {preview.error ? <ApiErrorAlert error={preview.error} title={t("editor.bookmark.fetchFailed")} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-title`}>{t("editor.bookmark.cardTitle")}</Label>
        <Input id={`${id}-title`} value={title} maxLength={LIMITS.maxBookmarkText} onChange={(event) => setTitle(event.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-description`}>{t("editor.bookmark.cardDescription")}</Label>
        <Textarea
          id={`${id}-description`}
          value={description}
          rows={3}
          maxLength={LIMITS.maxBookmarkText}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-site`}>{t("editor.bookmark.siteName")}</Label>
        <Input id={`${id}-site`} value={siteName} maxLength={200} onChange={(event) => setSiteName(event.target.value)} />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel", { ns: "common" })}
        </Button>
        <Button type="submit" disabled={!valid}>
          {initial ? t("editor.bookmark.save") : t("editor.bookmark.insert")}
        </Button>
      </DialogFooter>
    </form>
  );
}
