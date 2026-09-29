"use client";

import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { BubbleMenu } from "@tiptap/react/menus";
import { useTranslation } from "react-i18next";
import type { EditorActions } from "../context";
import { BlockTypeControl, LinkButton, MarkButtons, PaletteControl, useFormatState } from "./format-controls";
import { ToolbarSeparator } from "./toolbar-button";

/**
 * Selection toolbar (ADR-009 §5.3): block type, B I U S <>, link, colour,
 * highlight. Shown for a text selection outside code blocks; works on touch.
 */
export function TextBubbleMenu({ editor, actions }: { editor: Editor; actions: EditorActions }) {
  const { t } = useTranslation("admin");
  const format = useFormatState(editor);
  return (
    <BubbleMenu
      editor={editor}
      pluginKey="articleTextBubble"
      options={{ placement: "top", offset: 8 }}
      shouldShow={({ editor: current, state, from, to }) =>
        current.isEditable &&
        from !== to &&
        !(state.selection instanceof NodeSelection) &&
        !current.isActive("codeBlock") &&
        state.doc.textBetween(from, to, " ").trim().length > 0
      }
      className="z-50"
    >
      <div
        role="toolbar"
        aria-label={t("editor.toolbar.selection")}
        className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
      >
        <BlockTypeControl editor={editor} actions={actions} block={format.block} />
        <ToolbarSeparator />
        <MarkButtons editor={editor} state={format} />
        <ToolbarSeparator />
        <LinkButton actions={actions} active={format.link} />
        <PaletteControl editor={editor} kind="textColor" current={format.textColor} />
        <PaletteControl editor={editor} kind="highlight" current={format.highlight} />
      </div>
    </BubbleMenu>
  );
}
