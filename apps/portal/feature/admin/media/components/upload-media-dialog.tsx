"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageUp, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { getApiFieldErrors } from "@/lib/api/error";
import { formatBytes } from "@/lib/number";
import { cn } from "@/lib/utils";
import { useUploadMedia } from "../hooks";
import { ALT_MAX, MEDIA_ACCEPT, type AdminImage } from "../type";
import { altFromFileName, checkImageFile } from "../utils";

/** Upload form: file (JPEG/PNG/WebP, ≤ 10 MB) + required alt text (UC-19, ADR-003 §10.4). */
export function UploadMediaPanel({
  initialFile,
  onUploaded,
  onCancel,
}: {
  initialFile?: File | null;
  onUploaded: (image: AdminImage) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation("admin");
  const inputId = useId();
  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [alt, setAlt] = useState(initialFile ? altFromFileName(initialFile.name) : "");
  const [problem, setProblem] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const upload = useUploadMedia(setProgress);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function choose(next: File | null | undefined) {
    if (!next) return;
    const issue = checkImageFile(next);
    setProblem(issue === "type" ? t("media.errors.type") : issue === "size" ? t("media.errors.size") : null);
    if (issue) return;
    setFile(next);
    setAlt((current) => current || altFromFileName(next.name));
    upload.reset();
  }

  async function submit() {
    if (!file) return setProblem(t("media.errors.noFile"));
    if (!alt.trim()) return setProblem(t("media.errors.altRequired"));
    setProblem(null);
    setProgress(0);
    const image = await upload.mutateAsync({ file, alt: alt.trim() }).catch(() => null);
    if (image) onUploaded(image);
  }

  const status = (upload.error as { status?: number } | null)?.status;
  const fieldErrors = getApiFieldErrors(upload.error);
  const errorTitle =
    status === 413 ? t("media.errors.size") : status === 415 ? t("media.errors.type") : status === 400 ? t("media.errors.invalid") : undefined;

  return (
    <div className="space-y-4">
      <label
        htmlFor={inputId}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "hover:border-ring/60 hover:bg-muted/40",
        )}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL preview.
          <img src={preview} alt="" className="max-h-48 rounded-lg object-contain" />
        ) : (
          <UploadCloud className="size-8 text-muted-foreground" aria-hidden />
        )}
        <span className="text-sm font-medium">{file ? file.name : t("media.dropHere")}</span>
        <span className="text-xs text-muted-foreground">{file ? formatBytes(file.size) : t("media.fileHint")}</span>
        <input
          id={inputId}
          type="file"
          accept={MEDIA_ACCEPT}
          className="sr-only"
          onChange={(event) => choose(event.target.files?.[0])}
        />
      </label>
      <div className="space-y-1.5">
        <Label htmlFor={`${inputId}-alt`}>{t("media.alt")}</Label>
        <Input
          id={`${inputId}-alt`}
          value={alt}
          maxLength={ALT_MAX}
          onChange={(event) => setAlt(event.target.value)}
          placeholder={t("media.altPlaceholder")}
          aria-invalid={Boolean(fieldErrors?.alt) || undefined}
        />
        <p className="flex justify-between text-xs text-muted-foreground">
          <span>{fieldErrors?.alt ?? t("media.altHint")}</span>
          <span className="tabular-nums">
            {alt.length}/{ALT_MAX}
          </span>
        </p>
      </div>
      {problem ? <p className="text-sm text-destructive">{problem}</p> : null}
      {upload.error ? <ApiErrorAlert error={upload.error} title={errorTitle} extra={fieldErrors?.file ? [fieldErrors.file] : undefined} /> : null}
      {upload.isPending ? <Progress value={progress} className="h-1.5" /> : null}
      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={upload.isPending}>
            {t("cancel", { ns: "common" })}
          </Button>
        ) : null}
        <Button onClick={() => void submit()} loading={upload.isPending} disabled={!file}>
          <ImageUp aria-hidden />
          {t("media.upload")}
        </Button>
      </div>
    </div>
  );
}

export function UploadMediaDialog({
  open,
  onOpenChange,
  initialFile,
  onUploaded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFile?: File | null;
  onUploaded: (image: AdminImage) => void;
}) {
  const { t } = useTranslation("admin");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("media.uploadTitle")}</DialogTitle>
          <DialogDescription>{t("media.uploadDescription")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <UploadMediaPanel
            key={initialFile ? `${initialFile.name}-${initialFile.size}` : "empty"}
            initialFile={initialFile}
            onUploaded={(image) => {
              onUploaded(image);
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
