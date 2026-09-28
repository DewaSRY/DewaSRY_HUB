"use client";

import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * `409 VERSION_CONFLICT` (ADR-009 §6): the article was saved elsewhere.
 * Reload (lose local changes) or Copy my content (JSON to the clipboard,
 * then reload). Nothing is merged automatically.
 */
export function VersionConflictDialog({
  open,
  onReload,
  onCopyAndReload,
  reloading,
}: {
  open: boolean;
  onReload: () => void;
  onCopyAndReload: () => void;
  reloading: boolean;
}) {
  const { t } = useTranslation("admin");
  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("articles.conflict.title")}</DialogTitle>
          <DialogDescription>{t("articles.conflict.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCopyAndReload} disabled={reloading}>
            {t("articles.conflict.copy")}
          </Button>
          <Button variant="destructive-solid" onClick={onReload} loading={reloading}>
            {t("articles.conflict.reload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
