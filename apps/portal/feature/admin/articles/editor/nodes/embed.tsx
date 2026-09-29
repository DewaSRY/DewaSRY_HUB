"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { Play, Replace, Trash2, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EMBED_PROVIDERS, LIMITS, isEmbedProvider, isValidEmbedId, type EmbedProvider } from "@/feature/content";
import { useEditorUi } from "../context";
import { ToolbarButton } from "../menus/toolbar-button";
import { dataAttribute } from "./attrs";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleEmbed: {
      insertEmbed: (attrs: { provider: EmbedProvider; id: string; caption?: string | null }) => ReturnType;
    };
  }
}

function EmbedView({ node, selected, editor, updateAttributes, deleteNode, getPos }: ReactNodeViewProps) {
  const { t } = useTranslation("admin");
  const { actions } = useEditorUi();
  const { provider, id, caption } = node.attrs as { provider: string | null; id: string | null; caption: string | null };
  const valid = isEmbedProvider(provider) && isValidEmbedId(provider, id);
  const spec = valid ? EMBED_PROVIDERS[provider] : null;
  const thumbnail = spec?.thumbnail && id ? spec.thumbnail(id) : null;

  return (
    <NodeViewWrapper className="editor-atom" data-selected={selected || undefined}>
      <figure className="article-embed not-prose my-8" data-drag-handle>
        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border bg-muted">
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element -- provider thumbnail, same as the public facade.
            <img src={thumbnail} alt="" className="absolute inset-0 size-full object-cover opacity-80" loading="lazy" />
          ) : null}
          <span className="relative inline-flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm font-medium shadow">
            {valid ? <Play className="size-4" aria-hidden /> : <TriangleAlert className="size-4 text-warning" aria-hidden />}
            {spec ? `${spec.label} · ${id}` : t("editor.embed.invalid")}
          </span>
        </div>
        {caption ? <figcaption className="mt-2 text-center text-sm text-muted-foreground">{caption}</figcaption> : null}
      </figure>
      {selected && editor.isEditable ? (
        <div
          contentEditable={false}
          role="group"
          aria-label={t("editor.embed.menu")}
          className="not-prose -mt-6 mb-6 flex items-center gap-1 rounded-xl border bg-popover p-2 shadow-md"
        >
          <Input
            value={caption ?? ""}
            maxLength={LIMITS.maxEmbedCaption}
            onChange={(event) => updateAttributes({ caption: event.target.value || null })}
            placeholder={t("editor.embed.captionPlaceholder")}
            aria-label={t("editor.embed.caption")}
            className="h-8 flex-1 text-sm"
          />
          <ToolbarButton
            label={t("editor.embed.replace")}
            onClick={() => {
              const pos = getPos();
              actions.openEmbed(typeof pos === "number" ? { replacePos: pos } : undefined);
            }}
          >
            <Replace aria-hidden />
          </ToolbarButton>
          <ToolbarButton label={t("editor.embed.delete")} onClick={deleteNode}>
            <Trash2 aria-hidden />
          </ToolbarButton>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * `embed` block (ADR-009 §5.5): `provider` + `id` only. The frame URL is
 * built by the public renderer; the editor shows a static placeholder and
 * never loads the third-party frame.
 */
export const ArticleEmbed = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      provider: dataAttribute("provider"),
      id: dataAttribute("id"),
      caption: dataAttribute("caption"),
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="article-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ "data-type": "article-embed" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },

  addCommands() {
    return {
      insertEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
