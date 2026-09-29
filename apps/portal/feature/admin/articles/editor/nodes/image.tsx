"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { ImageOff } from "lucide-react";
import { ResponsiveImage, type ImageWidth } from "@/feature/content";
import { useEditorUi } from "../context";
import { ImageMenu, type ImageMenuAttrs } from "../menus/image-menu";
import { dataAttribute } from "./attrs";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    articleImage: {
      /** Inserts an `image` node that references a media library image. */
      insertArticleImage: (attrs: { imageId: string; alt?: string | null; caption?: string | null; width?: ImageWidth }) => ReturnType;
    };
  }
}

const WIDTHS: readonly ImageWidth[] = ["content", "wide", "full"];

function ImageView({ node, selected, editor, updateAttributes, deleteNode, getPos }: ReactNodeViewProps) {
  const { t } = useTranslation("admin");
  const { images, actions } = useEditorUi();
  const attrs = node.attrs as { imageId: string | null; alt: string | null; caption: string | null; width: ImageWidth | null };
  const width: ImageWidth = attrs.width && WIDTHS.includes(attrs.width) ? attrs.width : "content";
  const image = attrs.imageId ? images[attrs.imageId] : undefined;

  return (
    <NodeViewWrapper className="editor-atom" data-selected={selected || undefined}>
      <figure className="article-figure not-prose" data-width={width} data-drag-handle>
        {image ? (
          <ResponsiveImage image={image} alt={attrs.alt || image.alt} width={width} />
        ) : (
          <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted text-sm text-muted-foreground">
            <ImageOff className="size-6" aria-hidden />
            {t("editor.image.missing")}
          </div>
        )}
        {attrs.caption ? <figcaption className="mt-2 text-center text-sm text-muted-foreground">{attrs.caption}</figcaption> : null}
      </figure>
      {selected && editor.isEditable ? (
        <ImageMenu
          attrs={{ alt: attrs.alt, caption: attrs.caption, width } satisfies ImageMenuAttrs}
          libraryAlt={image?.alt ?? null}
          onChange={(next) => updateAttributes(next)}
          onReplace={() => {
            const pos = getPos();
            actions.openImagePicker(typeof pos === "number" ? { replacePos: pos } : undefined);
          }}
          onDelete={deleteNode}
        />
      ) : null}
    </NodeViewWrapper>
  );
}

/**
 * `image` block (ADR-009 §4.2/§4.3): stores only `imageId` plus `alt`
 * (override), `caption`, and `width`. URLs never enter the body; the view
 * reads the image from the editor's images map.
 */
export const ArticleImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      imageId: dataAttribute("imageId"),
      alt: dataAttribute("alt"),
      caption: dataAttribute("caption"),
      width: dataAttribute<ImageWidth>("width", "content"),
    };
  },

  // Only our own copy/paste markup; a pasted `<img>` never becomes a node.
  parseHTML() {
    return [{ tag: 'figure[data-type="article-image"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["figure", mergeAttributes({ "data-type": "article-image" }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },

  addCommands() {
    return {
      insertArticleImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { width: "content", ...attrs } }),
    };
  },
});
