"use client";

import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isAllowedHref } from "@/feature/content";
import { withProtocol } from "../utils";

/**
 * Inline link (`Ctrl+K`, toolbar, bubble menu). `href` must be `https:`,
 * `http:`, `mailto:`, or a site path starting with `/` or `#` (ADR-009 §4.2).
 */
export function LinkDialog({
  open,
  onOpenChange,
  initialHref,
  onSubmit,
  onRemove,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialHref: string;
  onSubmit: (href: string) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation("admin");
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("editor.link.title")}</DialogTitle>
          <DialogDescription>{t("editor.link.description")}</DialogDescription>
        </DialogHeader>
        {open ? (
          <LinkForm
            key={initialHref}
            id={id}
            initialHref={initialHref}
            onSubmit={(href) => {
              onSubmit(href);
              onOpenChange(false);
            }}
            onRemove={() => {
              onRemove();
              onOpenChange(false);
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function LinkForm({
  id,
  initialHref,
  onSubmit,
  onRemove,
  onCancel,
}: {
  id: string;
  initialHref: string;
  onSubmit: (href: string) => void;
  onRemove: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation("admin");
  const [value, setValue] = useState(initialHref);
  const [touched, setTouched] = useState(false);
  const href = withProtocol(value);
  const valid = isAllowedHref(href);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (valid) onSubmit(href);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor={`${id}-href`}>{t("editor.link.url")}</Label>
        <Input
          id={`${id}-href`}
          autoFocus
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="https://"
          aria-invalid={(touched && !valid) || undefined}
        />
        <p className={touched && !valid ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
          {touched && !valid ? t("editor.link.invalid") : t("editor.link.hint")}
        </p>
      </div>
      <DialogFooter>
        {initialHref ? (
          <Button type="button" variant="destructive" onClick={onRemove} className="sm:mr-auto">
            <Unlink aria-hidden />
            {t("editor.link.remove")}
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("cancel", { ns: "common" })}
        </Button>
        <Button type="submit" disabled={!value.trim()}>
          {t("editor.link.apply")}
        </Button>
      </DialogFooter>
    </form>
  );
}
