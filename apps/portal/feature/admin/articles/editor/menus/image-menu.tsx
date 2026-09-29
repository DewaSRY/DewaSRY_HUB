"use client";

import { useTranslation } from "react-i18next";
import { Maximize2, RectangleHorizontal, Replace, Square, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LIMITS, type ImageWidth } from "@/feature/content";
import { ToolbarButton, ToolbarSeparator } from "./toolbar-button";

const WIDTHS: { value: ImageWidth; icon: typeof Square }[] = [
  { value: "content", icon: Square },
  { value: "wide", icon: RectangleHorizontal },
  { value: "full", icon: Maximize2 },
];

export interface ImageMenuAttrs {
  alt: string | null;
  caption: string | null;
  width: ImageWidth;
}

/**
 * Context menu of a selected image (ADR-009 §5.3/§5.4): width
 * (`content` | `wide` | `full`), caption, an alt override for this article,
 * replace, and delete. Rendered inside the image node view.
 */
export function ImageMenu({
  attrs,
  libraryAlt,
  onChange,
  onReplace,
  onDelete,
}: {
  attrs: ImageMenuAttrs;
  libraryAlt: string | null;
  onChange: (attrs: Partial<ImageMenuAttrs>) => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation("admin");
  return (
    <div
      contentEditable={false}
      className="not-prose mt-2 space-y-2 rounded-xl border bg-popover p-2 text-popover-foreground shadow-md"
      role="group"
      aria-label={t("editor.image.menu")}
    >
      <div className="flex flex-wrap items-center gap-0.5">
        {WIDTHS.map(({ value, icon: Icon }) => (
          <ToolbarButton
            key={value}
            label={t(`editor.image.width.${value}`)}
            active={attrs.width === value}
            onClick={() => onChange({ width: value })}
          >
            <Icon aria-hidden />
          </ToolbarButton>
        ))}
        <ToolbarSeparator />
        <ToolbarButton label={t("editor.image.replace")} onClick={onReplace}>
          <Replace aria-hidden />
        </ToolbarButton>
        <ToolbarButton label={t("editor.image.delete")} onClick={onDelete}>
          <Trash2 aria-hidden />
        </ToolbarButton>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          value={attrs.caption ?? ""}
          maxLength={LIMITS.maxImageCaption}
          onChange={(event) => onChange({ caption: event.target.value || null })}
          placeholder={t("editor.image.captionPlaceholder")}
          aria-label={t("editor.image.caption")}
          className="h-8 text-sm"
        />
        <Input
          value={attrs.alt ?? ""}
          maxLength={LIMITS.maxImageAlt}
          onChange={(event) => onChange({ alt: event.target.value || null })}
          placeholder={libraryAlt ? t("editor.image.altFromLibrary", { alt: libraryAlt }) : t("editor.image.altPlaceholder")}
          aria-label={t("editor.image.alt")}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}
