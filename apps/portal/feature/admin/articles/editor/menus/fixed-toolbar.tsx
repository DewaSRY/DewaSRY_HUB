"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { Ellipsis, Redo2, RemoveFormatting, Subscript, Superscript, TextAlignCenter, TextAlignEnd, TextAlignStart, Undo2 } from "lucide-react";
import { blockCommand, runBlockCommand, type BlockId } from "../commands";
import type { EditorActions } from "../context";
import { BlockTypeControl, LinkButton, MarkButtons, PaletteControl, useFormatState } from "./format-controls";
import { PopoverItem, ToolbarButton, ToolbarPopover, ToolbarSeparator } from "./toolbar-button";

const ALIGNS = [
  { value: "left", icon: TextAlignStart },
  { value: "center", icon: TextAlignCenter },
  { value: "right", icon: TextAlignEnd },
] as const;

const LIST_BLOCKS: BlockId[] = ["bulletList", "orderedList", "taskList"];
const STRUCTURE_BLOCKS: BlockId[] = ["blockquote", "horizontalRule", "callout", "details", "codeBlock"];
const INSERT_BLOCKS: BlockId[] = ["image", "embed", "bookmark", "table"];

/**
 * Fixed toolbar (ADR-009 §5.1/§5.3):
 * `↶ ↷ | Text ▾ | B I U S <> | 🔗 | A▾ 🖍▾ | ≡▾ | • 1. ☐ | ❝ ⎯ ⓘ ▸ {} | 🖼 ▶ 🔗 ▦ | ⋯`.
 * On a phone it scrolls sideways.
 */
export function FixedToolbar({ editor, actions }: { editor: Editor; actions: EditorActions }) {
  const { t } = useTranslation("admin");
  const format = useFormatState(editor);
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
      align: (["center", "right"] as const).find((value) => current.isActive({ textAlign: value })) ?? "left",
      subscript: current.isActive("subscript"),
      superscript: current.isActive("superscript"),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      taskList: current.isActive("taskList"),
      blockquote: current.isActive("blockquote"),
      callout: current.isActive("callout"),
      details: current.isActive("details"),
      codeBlock: current.isActive("codeBlock"),
      inTable: current.isActive("table"),
    }),
  });
  const AlignIcon = ALIGNS.find((item) => item.value === state.align)?.icon ?? TextAlignStart;
  const active = (id: BlockId) => Boolean((state as Record<string, unknown>)[id]);

  const blockButton = (id: BlockId, shortcut?: string) => {
    const Icon = blockCommand(id).icon;
    const disabled = state.inTable && (INSERT_BLOCKS.includes(id) || id === "codeBlock" || id === "callout" || id === "details");
    return (
      <ToolbarButton
        key={id}
        label={t(`editor.blocks.${id}`)}
        shortcut={shortcut}
        active={id === "horizontalRule" || INSERT_BLOCKS.includes(id) ? undefined : active(id)}
        disabled={disabled}
        onClick={() => runBlockCommand(editor, id, actions)}
      >
        <Icon aria-hidden />
      </ToolbarButton>
    );
  };

  return (
    <div
      role="toolbar"
      aria-label={t("editor.toolbar.label")}
      className="flex items-center gap-0.5 overflow-x-auto border-b bg-background/95 px-2 py-1.5 backdrop-blur [scrollbar-width:thin]"
    >
      <ToolbarButton label={t("editor.toolbar.undo")} shortcut="Mod-z" disabled={!state.canUndo} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.toolbar.redo")} shortcut="Mod-Shift-z" disabled={!state.canRedo} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 aria-hidden />
      </ToolbarButton>
      <ToolbarSeparator />
      <BlockTypeControl editor={editor} actions={actions} block={format.block} />
      <ToolbarSeparator />
      <MarkButtons editor={editor} state={format} />
      <ToolbarSeparator />
      <LinkButton actions={actions} active={format.link} disabled={format.inCode} />
      <PaletteControl editor={editor} kind="textColor" current={format.textColor} disabled={format.inCode} />
      <PaletteControl editor={editor} kind="highlight" current={format.highlight} disabled={format.inCode} />
      <ToolbarSeparator />
      <ToolbarPopover label={t("editor.toolbar.align")} trigger={<AlignIcon aria-hidden />} className="min-w-36">
        {(close) =>
          ALIGNS.map(({ value, icon: Icon }) => (
            <PopoverItem
              key={value}
              active={state.align === value}
              onSelect={() => {
                if (value === "left") editor.chain().focus().unsetTextAlign().run();
                else editor.chain().focus().setTextAlign(value).run();
                close();
              }}
            >
              <Icon aria-hidden />
              {t(`editor.align.${value}`)}
            </PopoverItem>
          ))
        }
      </ToolbarPopover>
      <ToolbarSeparator />
      {LIST_BLOCKS.map((id) => blockButton(id, { bulletList: "Mod-Shift-8", orderedList: "Mod-Shift-7", taskList: "Mod-Shift-9" }[id as string]))}
      <ToolbarSeparator />
      {STRUCTURE_BLOCKS.map((id) => blockButton(id, id === "codeBlock" ? "Mod-Alt-c" : id === "blockquote" ? "Mod-Shift-b" : undefined))}
      <ToolbarSeparator />
      {INSERT_BLOCKS.map((id) => blockButton(id))}
      <ToolbarSeparator />
      <ToolbarPopover label={t("editor.toolbar.more")} trigger={<Ellipsis aria-hidden />} align="end" className="min-w-48">
        {(close) => (
          <>
            <PopoverItem
              active={state.subscript}
              onSelect={() => {
                editor.chain().focus().toggleSubscript().run();
                close();
              }}
            >
              <Subscript aria-hidden />
              {t("editor.marks.subscript")}
            </PopoverItem>
            <PopoverItem
              active={state.superscript}
              onSelect={() => {
                editor.chain().focus().toggleSuperscript().run();
                close();
              }}
            >
              <Superscript aria-hidden />
              {t("editor.marks.superscript")}
            </PopoverItem>
            <PopoverItem
              onSelect={() => {
                editor.chain().focus().unsetAllMarks().clearNodes().run();
                close();
              }}
            >
              <RemoveFormatting aria-hidden />
              {t("editor.toolbar.clearFormatting")}
            </PopoverItem>
          </>
        )}
      </ToolbarPopover>
    </div>
  );
}
