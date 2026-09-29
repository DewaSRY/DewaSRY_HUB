"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection, Selection } from "@tiptap/pm/state";
import { EditorContent, useEditor } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { pushToast } from "@/lib/toast/store";
import type { ArticleDoc, BodyImage, BodyImageMap, EmbedProvider } from "@/feature/content";
import { MediaPickerDialog, UploadMediaDialog, type AdminImage } from "@/feature/admin/media";
import { BLOCK_COMMANDS, runBlockCommand } from "./commands";
import { EditorUiContext, type BookmarkAttrs, type EditorActions } from "./context";
import { EmbedDialog } from "./dialogs/embed-dialog";
import { LinkCardDialog } from "./dialogs/link-card-dialog";
import { LinkDialog } from "./dialogs/link-dialog";
import { TableDialog } from "./dialogs/table-dialog";
import { createArticleExtensions, type EditorCallbacks } from "./extensions";
import { TextBubbleMenu } from "./menus/bubble-menu";
import { BlockDragHandle } from "./menus/drag-handle";
import { FixedToolbar } from "./menus/fixed-toolbar";
import type { SlashItem } from "./menus/slash-menu";
import { TableMenu } from "./menus/table-menu";
import type { ArticleEditorProps } from "./types";
import { docStats, positionForPath, sanitizeEditorDoc } from "./utils";

const toBodyImage = (image: AdminImage): BodyImage => ({
  id: image.id,
  alt: image.alt,
  width: image.width,
  height: image.height,
  variants: image.variants,
});

/** Replaces the attrs of the node at `pos` (replace image / embed / link card). */
function replaceNodeAttrs(editor: Editor, pos: number, attrs: Record<string, unknown>) {
  editor
    .chain()
    .focus()
    .command(({ tr }) => {
      const node = tr.doc.nodeAt(pos);
      if (!node) return false;
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs });
      tr.setSelection(NodeSelection.create(tr.doc, pos));
      return true;
    })
    .run();
}

type EmbedState = { url: string; replacePos?: number; offerKeepAsLink: boolean } | null;
type LinkCardState = { replacePos?: number; attrs: BookmarkAttrs | null } | null;
type UploadState = { file: File; pos?: number } | null;

/**
 * The Tiptap article editor (ADR-009 §5). Loaded only with
 * `next/dynamic(..., { ssr: false })` from the editor page, and created with
 * `immediatelyRender: false`, so no visitor ever downloads it.
 */
export default function ArticleEditor({
  initialContent,
  images: initialImages,
  onImagesChange,
  onChange,
  onReady,
  onStats,
  onSaveShortcut,
  editable = true,
  beforeContent,
  editorRef,
}: ArticleEditorProps) {
  const { t } = useTranslation("admin");
  const [images, setImages] = useState<BodyImageMap>(initialImages);
  const [prevInitialImages, setPrevInitialImages] = useState(initialImages);
  if (prevInitialImages !== initialImages) {
    // The page passes a new map after a restore or reload: merge it in.
    setPrevInitialImages(initialImages);
    setImages((current) => ({ ...current, ...initialImages }));
  }

  const [picker, setPicker] = useState<{ replacePos?: number } | null>(null);
  const [upload, setUpload] = useState<UploadState>(null);
  const [embed, setEmbed] = useState<EmbedState>(null);
  const [linkCard, setLinkCard] = useState<LinkCardState>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);

  const actions: EditorActions = useMemo(
    () => ({
      openImagePicker: (options) => setPicker(options ?? {}),
      openEmbed: (options) => setEmbed({ url: options?.url ?? "", replacePos: options?.replacePos, offerKeepAsLink: false }),
      openLinkCard: (options) => setLinkCard({ replacePos: options?.replacePos, attrs: options?.attrs ?? null }),
      openLink: () => setLinkOpen(true),
      openTable: () => setTableOpen(true),
      uploadFiles: (files, pos) => {
        const [file] = files;
        if (!file) return;
        if (files.length > 1) pushToast({ variant: "error", title: { key: "admin:editor.paste.oneImage" } });
        setUpload({ file, pos });
      },
    }),
    [],
  );

  // Extensions read the latest callbacks through this ref; the editor is created once.
  const slashItems = (): SlashItem[] =>
    BLOCK_COMMANDS.map((command) => ({
      id: command.id,
      label: t(`editor.blocks.${command.id}`),
      keywords: command.keywords,
      icon: command.icon,
      hint: command.hint,
      run: (editor, range) => runBlockCommand(editor, command.id, actions, range),
    }));
  const makeCallbacks = (): EditorCallbacks => ({
    placeholder: (kind) => t(`editor.placeholder.${kind}`),
    slashItems,
    slashLabels: () => ({ empty: t("editor.slash.empty"), label: t("editor.slash.label") }),
    onFiles: actions.uploadFiles,
    onPastedImages: () => pushToast({ variant: "error", title: { key: "admin:editor.paste.imagesDropped" } }),
    onEmbedUrl: (url) => setEmbed({ url, offerKeepAsLink: true }),
    onLinkShortcut: actions.openLink,
    onSaveShortcut: () => onSaveShortcut?.(),
  });
  const callbacks = useRef<EditorCallbacks>(makeCallbacks());
  useEffect(() => {
    callbacks.current = makeCallbacks();
  });
  // eslint-disable-next-line react-hooks/refs -- the getter runs only in editor events and plugins, never during render.
  const [extensions] = useState(() => createArticleExtensions(() => callbacks.current));

  const report = (editor: Editor) => {
    const doc = sanitizeEditorDoc(editor.getJSON() as ArticleDoc);
    onStats?.(docStats(doc));
    return doc;
  };

  const editor = useEditor({
    extensions,
    content: initialContent,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "article-body prose prose-neutral dark:prose-invert max-w-none article-editor-content",
        "aria-label": t("editor.ariaLabel"),
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onCreate: ({ editor: created }) => onReady?.(report(created)),
    onUpdate: ({ editor: updated }) => onChange(report(updated)),
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable);
  }, [editor, editable]);

  useImperativeHandle(
    editorRef,
    () => ({
      getJSON: () => (editor ? sanitizeEditorDoc(editor.getJSON() as ArticleDoc) : initialContent),
      setContent: (doc) => editor?.commands.setContent(doc, { emitUpdate: true }),
      focus: () => editor?.commands.focus(),
      scrollToPath: (path) => {
        if (!editor) return false;
        const pos = positionForPath(editor.state.doc, path);
        if (pos === null) return false;
        const node = editor.state.doc.nodeAt(pos);
        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setSelection(node?.isAtom ? NodeSelection.create(tr.doc, pos) : Selection.near(tr.doc.resolve(pos + 1)));
            return true;
          })
          .run();
        const dom = editor.view.nodeDOM(pos);
        if (dom instanceof HTMLElement) {
          dom.scrollIntoView({ block: "center", behavior: "smooth" });
          dom.classList.add("editor-flash");
          window.setTimeout(() => dom.classList.remove("editor-flash"), 2000);
        }
        return true;
      },
    }),
    [editor, initialContent],
  );

  function addImage(image: AdminImage) {
    const next = { ...images, [image.id]: toBodyImage(image) };
    setImages(next);
    onImagesChange?.(next);
  }

  function insertImage(image: AdminImage, options: { replacePos?: number; pos?: number }) {
    if (!editor) return;
    addImage(image);
    if (options.replacePos !== undefined) {
      replaceNodeAttrs(editor, options.replacePos, { imageId: image.id });
      return;
    }
    const content = { type: "image", attrs: { imageId: image.id, width: "content" } };
    if (options.pos !== undefined) editor.chain().focus().insertContentAt(options.pos, content).run();
    else editor.chain().focus().insertArticleImage({ imageId: image.id }).run();
  }

  function insertEmbed(value: { provider: EmbedProvider; id: string }, replacePos?: number) {
    if (!editor) return;
    if (replacePos !== undefined) replaceNodeAttrs(editor, replacePos, value);
    else editor.chain().focus().insertEmbed(value).run();
  }

  function insertLinkText(href: string) {
    editor
      ?.chain()
      .focus()
      .insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] })
      .run();
  }

  if (!editor) {
    return <div className="min-h-[60vh] animate-pulse rounded-xl border bg-muted/30" aria-busy />;
  }

  return (
    <EditorUiContext.Provider value={{ images, actions }}>
      <div className="article-editor rounded-xl border bg-card shadow-xs">
        <div className="sticky top-28 z-10 overflow-hidden rounded-t-xl">
          <FixedToolbar editor={editor} actions={actions} />
          <TableMenu editor={editor} />
        </div>
        <div className="mx-auto w-full max-w-[76ch] px-6 pt-8 pb-24 sm:px-14">
          {beforeContent}
          <div className="relative">
            <EditorContent editor={editor} />
            <BlockDragHandle editor={editor} actions={actions} />
          </div>
        </div>
        <TextBubbleMenu editor={editor} actions={actions} />
      </div>

      <MediaPickerDialog
        open={picker !== null}
        onOpenChange={(open) => !open && setPicker(null)}
        title={t("editor.image.pickerTitle")}
        onPick={(image) => insertImage(image, { replacePos: picker?.replacePos })}
      />
      <UploadMediaDialog
        open={upload !== null}
        onOpenChange={(open) => !open && setUpload(null)}
        initialFile={upload?.file ?? null}
        onUploaded={(image) => insertImage(image, { pos: upload?.pos })}
      />
      <LinkDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        initialHref={linkOpen ? ((editor.getAttributes("link").href as string | undefined) ?? "") : ""}
        onSubmit={(href) => {
          if (editor.state.selection.empty && !editor.isActive("link")) insertLinkText(href);
          else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        }}
        onRemove={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}
      />
      <EmbedDialog
        open={embed !== null}
        onOpenChange={(open) => !open && setEmbed(null)}
        initialUrl={embed?.url ?? ""}
        offerKeepAsLink={embed?.offerKeepAsLink ?? false}
        onEmbed={(value) => insertEmbed(value, embed?.replacePos)}
        onKeepAsLink={insertLinkText}
        onLinkCard={(url) => setLinkCard({ attrs: { url } })}
      />
      <LinkCardDialog
        open={linkCard !== null}
        onOpenChange={(open) => !open && setLinkCard(null)}
        initial={linkCard?.attrs ?? null}
        onSubmit={(attrs) => {
          if (linkCard?.replacePos !== undefined) replaceNodeAttrs(editor, linkCard.replacePos, { ...attrs });
          else editor.chain().focus().insertBookmark(attrs).run();
        }}
      />
      <TableDialog open={tableOpen} onOpenChange={setTableOpen} onInsert={(options) => editor.chain().focus().insertTable(options).run()} />
    </EditorUiContext.Provider>
  );
}
