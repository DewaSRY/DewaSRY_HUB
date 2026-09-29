"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Selection } from "@tiptap/pm/state";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import { useTranslation } from "react-i18next";
import { Copy, GripVertical, Trash2 } from "lucide-react";
import { blockCommand, runBlockCommand, TURN_INTO } from "../commands";
import type { EditorActions } from "../context";
import { PopoverItem, ToolbarPopover } from "./toolbar-button";

/**
 * Drag handle (⋮⋮) on the left of each top-level block (ADR-009 §5.3): drag
 * to move, click for the block menu — turn into, duplicate, delete.
 */
export function BlockDragHandle({ editor, actions }: { editor: Editor; actions: EditorActions }) {
  const { t } = useTranslation("admin");
  const [target, setTarget] = useState<{ node: PMNode; pos: number } | null>(null);

  if (!editor.isEditable) return null;

  return (
    <DragHandle
      editor={editor}
      className="editor-drag-handle"
      onNodeChange={({ node, pos }) => setTarget(node ? { node, pos } : null)}
    >
      <ToolbarPopover
        label={t("editor.dragHandle.label")}
        trigger={<GripVertical aria-hidden />}
        chevron={false}
        buttonClassName="h-7 min-w-6 cursor-grab px-0.5 text-muted-foreground active:cursor-grabbing"
        className="min-w-48"
        onOpenChange={(open) => {
          // The React <DragHandle> registers only the plugin, not the extension
          // that defines lock/unlockDragHandle — set the meta the plugin reads.
          editor.commands.setMeta("lockDragHandle", open);
        }}
      >
        {(close) => {
          if (!target) return null;
          const { node, pos } = target;
          const textBlock = node.isTextblock || ["bulletList", "orderedList", "taskList", "blockquote", "callout"].includes(node.type.name);
          return (
            <>
              {textBlock ? (
                <>
                  <p className="px-2 pt-1 pb-0.5 text-xs font-medium text-muted-foreground">{t("editor.dragHandle.turnInto")}</p>
                  {TURN_INTO.map((id) => {
                    const Icon = blockCommand(id).icon;
                    return (
                      <PopoverItem
                        key={id}
                        onSelect={() => {
                          editor
                            .chain()
                            .focus()
                            .command(({ tr }) => {
                              tr.setSelection(Selection.near(tr.doc.resolve(pos + 1)));
                              return true;
                            })
                            .run();
                          runBlockCommand(editor, id, actions);
                          close();
                        }}
                      >
                        <Icon aria-hidden />
                        {t(`editor.blocks.${id}`)}
                      </PopoverItem>
                    );
                  })}
                  <div role="separator" className="my-1 h-px bg-border" />
                </>
              ) : null}
              <PopoverItem
                onSelect={() => {
                  editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
                  close();
                }}
              >
                <Copy aria-hidden />
                {t("editor.dragHandle.duplicate")}
              </PopoverItem>
              <PopoverItem
                onSelect={() => {
                  editor.chain().focus().deleteRange({ from: pos, to: pos + node.nodeSize }).run();
                  close();
                }}
              >
                <Trash2 aria-hidden />
                {t("editor.dragHandle.delete")}
              </PopoverItem>
            </>
          );
        }}
      </ToolbarPopover>
    </DragHandle>
  );
}
