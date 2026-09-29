"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Columns3,
  PanelLeft,
  PanelTop,
  Rows3,
  TableCellsMerge,
  TableCellsSplit,
  Trash2,
} from "lucide-react";
import { ToolbarButton, ToolbarSeparator } from "./toolbar-button";

/**
 * Table menu (ADR-009 §5.6), shown under the fixed toolbar while the cursor
 * is in a table: add/delete rows and columns, header row/column, merge and
 * split cells, delete table. `Tab` / `Shift+Tab` move between cells and
 * `Tab` in the last cell adds a row (built into the table extension).
 */
export function TableMenu({ editor }: { editor: Editor }) {
  const { t } = useTranslation("admin");
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      current.isActive("table")
        ? {
            inTable: true,
            canMerge: current.can().mergeCells(),
            canSplit: current.can().splitCell(),
          }
        : { inTable: false, canMerge: false, canSplit: false },
  });
  if (!state.inTable || !editor.isEditable) return null;
  const run = (command: (chain: ReturnType<Editor["chain"]>) => ReturnType<Editor["chain"]>) => command(editor.chain().focus()).run();

  return (
    <div
      role="toolbar"
      aria-label={t("editor.table.menu")}
      className="flex items-center gap-0.5 overflow-x-auto border-b bg-muted/40 px-2 py-1 [scrollbar-width:thin]"
    >
      <span className="mr-1 shrink-0 text-xs font-medium text-muted-foreground">{t("editor.blocks.table")}</span>
      <ToolbarButton label={t("editor.table.addRowBefore")} onClick={() => run((chain) => chain.addRowBefore())}>
        <ArrowUpToLine aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.table.addRowAfter")} onClick={() => run((chain) => chain.addRowAfter())}>
        <ArrowDownToLine aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.table.deleteRow")} onClick={() => run((chain) => chain.deleteRow())}>
        <Rows3 aria-hidden />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton label={t("editor.table.addColumnBefore")} onClick={() => run((chain) => chain.addColumnBefore())}>
        <ArrowLeftToLine aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.table.addColumnAfter")} onClick={() => run((chain) => chain.addColumnAfter())}>
        <ArrowRightToLine aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.table.deleteColumn")} onClick={() => run((chain) => chain.deleteColumn())}>
        <Columns3 aria-hidden />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton label={t("editor.table.toggleHeaderRow")} onClick={() => run((chain) => chain.toggleHeaderRow())}>
        <PanelTop aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.table.toggleHeaderColumn")} onClick={() => run((chain) => chain.toggleHeaderColumn())}>
        <PanelLeft aria-hidden />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton label={t("editor.table.merge")} disabled={!state.canMerge} onClick={() => run((chain) => chain.mergeCells())}>
        <TableCellsMerge aria-hidden />
      </ToolbarButton>
      <ToolbarButton label={t("editor.table.split")} disabled={!state.canSplit} onClick={() => run((chain) => chain.splitCell())}>
        <TableCellsSplit aria-hidden />
      </ToolbarButton>
      <ToolbarSeparator />
      <ToolbarButton label={t("editor.table.delete")} onClick={() => run((chain) => chain.deleteTable())}>
        <Trash2 aria-hidden />
      </ToolbarButton>
    </div>
  );
}
