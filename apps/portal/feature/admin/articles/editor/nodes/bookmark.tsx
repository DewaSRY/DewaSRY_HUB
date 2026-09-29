"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { Link2, Pencil, Trash2 } from "lucide-react";
import { useEditorUi, type BookmarkAttrs } from "../context";
import { ToolbarButton } from "../menus/toolbar-button";
import { dataAttribute } from "./attrs";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleBookmark: {
      insertBookmark: (attrs: BookmarkAttrs) => ReturnType;
    };
  }
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function BookmarkView({ node, selected, editor, deleteNode, getPos }: ReactNodeViewProps) {
  const { t } = useTranslation("admin");
  const { actions } = useEditorUi();
  const attrs = node.attrs as BookmarkAttrs;
  const host = hostOf(attrs.url ?? "");

  return (
    <NodeViewWrapper className="editor-atom" data-selected={selected || undefined}>
      <div className="article-bookmark not-prose my-6 flex items-start gap-4 rounded-xl border bg-card p-4 shadow-xs" data-drag-handle>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{attrs.title || host || t("editor.bookmark.untitled")}</span>
          {attrs.description ? <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">{attrs.description}</span> : null}
          <span className="mt-2 block truncate text-xs text-muted-foreground">
            {attrs.siteName ? `${attrs.siteName} · ` : ""}
            {host}
          </span>
        </span>
        <Link2 className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      {selected && editor.isEditable ? (
        <div
          contentEditable={false}
          role="group"
          aria-label={t("editor.bookmark.menu")}
          className="not-prose -mt-4 mb-6 flex w-fit items-center gap-1 rounded-xl border bg-popover p-1 shadow-md"
        >
          <ToolbarButton
            label={t("editor.bookmark.edit")}
            onClick={() => {
              const pos = getPos();
              actions.openLinkCard({ replacePos: typeof pos === "number" ? pos : undefined, attrs });
            }}
          >
            <Pencil aria-hidden />
          </ToolbarButton>
          <ToolbarButton label={t("editor.bookmark.delete")} onClick={deleteNode}>
            <Trash2 aria-hidden />
          </ToolbarButton>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * `bookmark` block — a link card (ADR-009 §5.5): `url` (https), `title`,
 * `description`, `siteName`. Metadata comes from `POST /admin/link-preview`
 * and stays editable. No remote image.
 */
export const ArticleBookmark = Node.create({
  name: "bookmark",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      url: dataAttribute("url"),
      title: dataAttribute("title"),
      description: dataAttribute("description"),
      siteName: dataAttribute("siteName"),
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="article-bookmark"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes({ "data-type": "article-bookmark" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView);
  },

  addCommands() {
    return {
      insertBookmark:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
