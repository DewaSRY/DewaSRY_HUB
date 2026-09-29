"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { Baseline, Bold, Code, Highlighter, Italic, Link, Strikethrough, Underline, X } from "lucide-react";
import { PALETTE_KEYS, paletteVar, type PaletteKey } from "@/feature/content";
import { activeBlock, blockCommand, runBlockCommand, TURN_INTO, type BlockId } from "../commands";
import type { EditorActions } from "../context";
import { PopoverItem, ToolbarButton, ToolbarPopover } from "./toolbar-button";

/**
 * Controls shared by the fixed toolbar and the bubble menu (ADR-009 §5.3):
 * block type, inline marks, link, text colour, and highlight.
 */

export function useFormatState(editor: Editor) {
  return useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      block: activeBlock(current),
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      code: current.isActive("code"),
      link: current.isActive("link"),
      textColor: (current.getAttributes("textColor").color as PaletteKey | undefined) ?? null,
      highlight: current.isActive("highlight") ? ((current.getAttributes("highlight").color as PaletteKey | undefined) ?? "yellow") : null,
      inCode: current.isActive("codeBlock"),
    }),
  });
}

export function BlockTypeControl({ editor, actions, block }: { editor: Editor; actions: EditorActions; block: BlockId }) {
  const { t } = useTranslation("admin");
  const current = blockCommand(block);
  const Icon = current.icon;
  return (
    <ToolbarPopover
      label={t("editor.toolbar.blockType")}
      trigger={
        <>
          <Icon aria-hidden />
          <span className="hidden text-xs sm:inline">{t(`editor.blocks.${block}`)}</span>
        </>
      }
      className="min-w-48"
    >
      {(close) =>
        TURN_INTO.map((id) => {
          const ItemIcon = blockCommand(id).icon;
          return (
            <PopoverItem
              key={id}
              active={id === block}
              onSelect={() => {
                // Toggle commands would undo an active list/quote: only run when changing.
                if (id !== block) runBlockCommand(editor, id, actions);
                close();
              }}
            >
              <ItemIcon aria-hidden />
              {t(`editor.blocks.${id}`)}
            </PopoverItem>
          );
        })
      }
    </ToolbarPopover>
  );
}

export function MarkButtons({ editor, state }: { editor: Editor; state: ReturnType<typeof useFormatState> }) {
  const { t } = useTranslation("admin");
  const disabled = state.inCode;
  return (
    <>
      <ToolbarButton label={t("editor.marks.bold")} shortcut="Mod-b" active={state.bold} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.marks.italic")} shortcut="Mod-i" active={state.italic} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label={t("editor.marks.underline")}
        shortcut="Mod-u"
        active={state.underline}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline aria-hidden />
      </ToolbarButton>
      <ToolbarButton
        label={t("editor.marks.strike")}
        shortcut="Mod-Shift-s"
        active={state.strike}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.marks.code")} shortcut="Mod-e" active={state.code} disabled={disabled} onClick={() => editor.chain().focus().toggleCode().run()}>
        <Code aria-hidden />
      </ToolbarButton>
    </>
  );
}

export function LinkButton({ actions, active, disabled }: { actions: EditorActions; active: boolean; disabled?: boolean }) {
  const { t } = useTranslation("admin");
  return (
    <ToolbarButton label={t("editor.marks.link")} shortcut="Mod-k" active={active} disabled={disabled} onClick={actions.openLink}>
      <Link aria-hidden />
    </ToolbarButton>
  );
}

function Swatch({ color, kind }: { color: PaletteKey; kind: "text" | "bg" }) {
  return kind === "text" ? (
    <span className="flex size-5 items-center justify-center rounded border text-xs font-semibold" style={{ color: paletteVar(color, "text") }} aria-hidden>
      A
    </span>
  ) : (
    <span className="size-5 rounded border" style={{ background: paletteVar(color, "bg") }} aria-hidden />
  );
}

/** Text colour or highlight palette (palette keys only, ADR-009 §4.5). */
export function PaletteControl({
  editor,
  kind,
  current,
  disabled,
}: {
  editor: Editor;
  kind: "textColor" | "highlight";
  current: PaletteKey | null;
  disabled?: boolean;
}) {
  const { t } = useTranslation("admin");
  const Icon = kind === "textColor" ? Baseline : Highlighter;
  const label = kind === "textColor" ? t("editor.marks.textColor") : t("editor.marks.highlight");
  return (
    <ToolbarPopover
      label={label}
      active={Boolean(current)}
      disabled={disabled}
      trigger={
        <Icon
          aria-hidden
          style={current ? { color: kind === "textColor" ? paletteVar(current, "text") : undefined, background: kind === "highlight" ? paletteVar(current, "bg") : undefined } : undefined}
          className="rounded-sm"
        />
      }
      className="w-44"
    >
      {(close) => (
        <div className="space-y-1">
          <div className="grid grid-cols-4 gap-1 p-1">
            {PALETTE_KEYS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={t(`editor.colors.${color}`)}
                title={t(`editor.colors.${color}`)}
                aria-pressed={current === color}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (kind === "textColor") editor.chain().focus().setTextColor(color).run();
                  else editor.chain().focus().setHighlight({ color }).run();
                  close();
                }}
                className="flex size-8 items-center justify-center rounded-md hover:bg-muted aria-pressed:ring-2 aria-pressed:ring-primary"
              >
                <Swatch color={color} kind={kind === "textColor" ? "text" : "bg"} />
              </button>
            ))}
          </div>
          <PopoverItem
            onSelect={() => {
              if (kind === "textColor") editor.chain().focus().unsetTextColor().run();
              else editor.chain().focus().unsetHighlight().run();
              close();
            }}
          >
            <X aria-hidden />
            {t("editor.colors.none")}
          </PopoverItem>
        </div>
      )}
    </ToolbarPopover>
  );
}
