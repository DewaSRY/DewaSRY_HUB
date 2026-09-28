"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { FileText, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { CopyButton } from "@/components/common/copy-button";
import { toApiError } from "@/lib/api/error";
import { formatDateTime } from "@/lib/datetime";
import { formatBytes } from "@/lib/number";
import { useDeleteMedia, useMedia, useUpdateMediaAlt } from "../hooks";
import { ALT_MAX, type AdminImage } from "../type";
import { MediaThumb } from "./media-grid";

function AltEditor({ image }: { image: AdminImage }) {
  const { t } = useTranslation("admin");
  const [alt, setAlt] = useState(image.alt);
  const update = useUpdateMediaAlt();
  return (
    <div className="space-y-1.5">
      <Label htmlFor="media-alt">{t("media.alt")}</Label>
      <div className="flex gap-2">
        <Input id="media-alt" value={alt} maxLength={ALT_MAX} onChange={(event) => setAlt(event.target.value)} />
        <Button
          variant="outline"
          onClick={() => update.mutate({ id: image.id, alt: alt.trim() })}
          loading={update.isPending}
          disabled={!alt.trim() || alt.trim() === image.alt}
        >
          {t("save", { ns: "common" })}
        </Button>
      </div>
      {update.error ? <ApiErrorAlert error={update.error} /> : null}
    </div>
  );
}

/** One image: preview, alt text, usage, CloudFront URLs, delete (UC-19). */
export function MediaDetailDialog({ imageId, onOpenChange }: { imageId: string | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("admin");
  const { locale } = useParams<{ locale: string }>();
  const { data: image, isPending } = useMedia(imageId);
  const remove = useDeleteMedia();
  const [confirming, setConfirming] = useState(false);
  const deleteError = toApiError(remove.error);
  // 409 IMAGE_IN_USE: one error item per article (field "articles", message = title).
  const blockingArticles = deleteError?.status === 409 ? deleteError.fieldErrors.map((item) => item.message) : [];

  return (
    <Dialog
      open={Boolean(imageId)}
      onOpenChange={(open) => {
        if (!open) {
          setConfirming(false);
          remove.reset();
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("media.detailTitle")}</DialogTitle>
          <DialogDescription>{image?.fileName ?? " "}</DialogDescription>
        </DialogHeader>
        {isPending || !image ? (
          <Skeleton className="aspect-video w-full rounded-xl" />
        ) : (
          <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
            <div className="overflow-hidden rounded-xl border bg-muted">
              <MediaThumb image={image} className="max-h-80 object-contain" />
            </div>
            <div className="space-y-4 text-sm">
              <AltEditor key={image.alt} image={image} />
              <dl className="grid grid-cols-2 gap-2">
                <dt className="text-muted-foreground">{t("media.dimensions")}</dt>
                <dd>
                  {image.width}×{image.height}
                </dd>
                <dt className="text-muted-foreground">{t("media.size")}</dt>
                <dd>{formatBytes(image.sizeBytes)}</dd>
                <dt className="text-muted-foreground">{t("media.uploadedAt")}</dt>
                <dd>{formatDateTime(image.createdAt, { locale })}</dd>
              </dl>
              <div className="space-y-1.5">
                <p className="font-medium">{t("media.urls")}</p>
                <ul className="space-y-1">
                  {[...image.variants]
                    .sort((a, b) => a.width - b.width)
                    .map((variant) => (
                      <li key={variant.width} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-2 py-1">
                        <span className="font-mono text-xs">{variant.width}w</span>
                        <CopyButton value={variant.url} label={t("media.copyUrl", { width: variant.width })} />
                      </li>
                    ))}
                </ul>
              </div>
              <div className="space-y-1.5">
                <p className="font-medium">{t("media.usedBy")}</p>
                {image.usedBy.length ? (
                  <ul className="space-y-1">
                    {image.usedBy.map((usage) => (
                      <li key={`${usage.id}-${usage.usage}`} className="flex items-center gap-2">
                        <FileText className="size-3.5 text-muted-foreground" aria-hidden />
                        <Link href={`/admin/articles/${usage.id}`} className="truncate hover:underline">
                          {usage.title}
                        </Link>
                        <Badge variant="outline">{t(`media.usage.${usage.usage}`)}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">{t("media.notUsed")}</p>
                )}
              </div>
            </div>
          </div>
        )}
        {remove.error ? (
          <ApiErrorAlert
            error={remove.error}
            title={deleteError?.status === 409 ? t("media.inUseTitle") : undefined}
            extra={blockingArticles}
          />
        ) : null}
        <DialogFooter className="sm:justify-between">
          {image ? (
            confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-destructive">{t("media.confirmDelete")}</span>
                <Button
                  variant="destructive-solid"
                  size="sm"
                  loading={remove.isPending}
                  onClick={() =>
                    remove.mutate(image.id, {
                      onSuccess: () => onOpenChange(false),
                      onError: () => setConfirming(false),
                    })
                  }
                >
                  {t("delete", { ns: "common" })}
                </Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={() => setConfirming(true)} disabled={image.usedBy.length > 0}>
                <Trash2 aria-hidden />
                {image.usedBy.length > 0 ? t("media.cannotDelete") : t("delete", { ns: "common" })}
              </Button>
            )
          ) : (
            <span />
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("close", { ns: "common" })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
