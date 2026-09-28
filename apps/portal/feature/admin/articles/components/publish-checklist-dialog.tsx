"use client";

import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiErrorAlert } from "@/components/common/api-error-alert";
import { canPublish, type ChecklistItem } from "../utils";

/**
 * Publish checklist (ADR-009 §6): title, slug, excerpt, and category are
 * required by the API (`422 ARTICLE_INCOMPLETE`); cover, meta description,
 * and image alt text are warnings.
 */
export function PublishChecklistDialog({
  open,
  onOpenChange,
  items,
  onPublish,
  onOpenSettings,
  publishing,
  error,
  hasUnsavedChanges,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: ChecklistItem[];
  onPublish: () => void;
  onOpenSettings: () => void;
  publishing: boolean;
  error: unknown;
  hasUnsavedChanges: boolean;
}) {
  const { t } = useTranslation("admin");
  const ready = canPublish(items);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("articles.checklist.title")}</DialogTitle>
          <DialogDescription>{t("articles.checklist.description")}</DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {items.map((item) => {
            const Icon = item.ok ? CheckCircle2 : item.required ? XCircle : AlertTriangle;
            const tone = item.ok ? "text-success" : item.required ? "text-destructive" : "text-warning";
            return (
              <li key={item.key} className="flex items-start gap-2.5 text-sm">
                <Icon className={`mt-0.5 size-4 shrink-0 ${tone}`} aria-hidden />
                <span>
                  {t(`articles.checklist.items.${item.key}`, { count: item.count ?? 0 })}
                  {!item.ok ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {item.required ? t("articles.checklist.required") : t("articles.checklist.recommended")}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
        {hasUnsavedChanges ? <p className="text-xs text-muted-foreground">{t("articles.checklist.savesFirst")}</p> : null}
        {error ? <ApiErrorAlert error={error} /> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onOpenSettings}>
            {t("articles.checklist.openSettings")}
          </Button>
          <Button onClick={onPublish} disabled={!ready} loading={publishing}>
            {t("articles.publish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
