import { Extension, type Extensions } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { Details, DetailsContent, DetailsSummary } from "@tiptap/extension-details";
import FileHandler from "@tiptap/extension-file-handler";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Placeholder } from "@tiptap/extensions";
import { CELL_BLOCK_TYPES, isAllowedHref, parseEmbedUrl } from "@/feature/content";
import { PaletteHighlight, TextColor } from "./marks/text-color";
import { ArticleBookmark } from "./nodes/bookmark";
import { Callout } from "./nodes/callout";
import { ArticleCodeBlock } from "./nodes/code-block";
import { ArticleEmbed } from "./nodes/embed";
import { ArticleImage } from "./nodes/image";
import { SlashCommand, type SlashItem } from "./menus/slash-menu";
import { htmlHasImages, singleUrl } from "./utils";

/**
 * The ONE extension list of the article editor (ADR-009 §5.2). Node, mark,
 * and attribute names match the allowlist in
 * `feature/content/article-schema/allowlist.ts` exactly; `extensions.test.ts`
 * checks the schema against it.
 *
 * Callbacks are read through `getCallbacks()` on every event, so the editor
 * is created once and never rebuilt when the page re-renders.
 */
export interface EditorCallbacks {
  placeholder: (kind: "paragraph" | "heading" | "summary") => string;
  slashItems: () => SlashItem[];
  slashLabels: () => { empty: string; label: string };
  /** Pasted or dropped image files (upload dialog; alt text is required). */
  onFiles: (files: File[], pos?: number) => void;
  /** Pasted HTML contained images that were dropped (toast: upload them first). */
  onPastedImages: () => void;
  /** A supported embed URL pasted on an empty line: "Embed / Keep as link". */
  onEmbedUrl: (url: string) => void;
  onLinkShortcut: () => void;
  onSaveShortcut: () => void;
}

const NOOP_CALLBACKS: EditorCallbacks = {
  placeholder: () => "",
  slashItems: () => [],
  slashLabels: () => ({ empty: "", label: "" }),
  onFiles: () => undefined,
  onPastedImages: () => undefined,
  onEmbedUrl: () => undefined,
  onLinkShortcut: () => undefined,
  onSaveShortcut: () => undefined,
};

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Table cells hold text and lists only (ADR-009 §5.6). */
const CELL_CONTENT = `(${CELL_BLOCK_TYPES.join(" | ")})+`;

/** `Ctrl/Cmd+K` link dialog and `Ctrl/Cmd+S` save. */
function shortcuts(getCallbacks: () => EditorCallbacks) {
  return Extension.create({
    name: "articleShortcuts",
    addKeyboardShortcuts() {
      return {
        "Mod-k": () => {
          getCallbacks().onLinkShortcut();
          return true;
        },
        "Mod-s": () => {
          getCallbacks().onSaveShortcut();
          return true;
        },
        // Highlight always carries a palette key (default yellow).
        "Mod-Shift-h": () => this.editor.commands.toggleHighlight({ color: "yellow" }),
      };
    },
  });
}

/**
 * Paste rules the schema cannot express (ADR-009 §5.4/§5.5):
 * - HTML with images: the images are dropped by the schema (there is no
 *   `<img>` parse rule); tell the admin to upload them first.
 * - One supported embed URL on an empty line: offer "Embed / Keep as link".
 * Files are handled by `FileHandler`.
 */
function pasteGuard(getCallbacks: () => EditorCallbacks) {
  return Extension.create({
    name: "articlePasteGuard",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("articlePasteGuard"),
          props: {
            handlePaste: (view, event) => {
              const data = event.clipboardData;
              if (!data || data.files.length) return false;
              const html = data.getData("text/html");
              if (htmlHasImages(html)) {
                getCallbacks().onPastedImages();
                return false;
              }
              const url = singleUrl(data.getData("text/plain"));
              const { $from, empty } = view.state.selection;
              const emptyLine = empty && $from.parent.type.name === "paragraph" && $from.parent.content.size === 0;
              if (url && emptyLine && parseEmbedUrl(url)) {
                getCallbacks().onEmbedUrl(url);
                return true;
              }
              return false;
            },
          },
        }),
      ];
    },
  });
}

export function createArticleExtensions(getCallbacks: () => EditorCallbacks = () => NOOP_CALLBACKS): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      codeBlock: false,
      link: {
        openOnClick: false,
        enableClickSelection: true,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: "https",
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
        isAllowedUri: (url) => isAllowedHref(url),
        shouldAutoLink: (url) => isAllowedHref(url),
      },
    }),
    ArticleCodeBlock,
    TaskList,
    TaskItem.configure({ nested: true }),
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right"] }),
    PaletteHighlight,
    TextColor,
    Subscript,
    Superscript,
    Table.configure({ resizable: true, allowTableNodeSelection: true, HTMLAttributes: { class: "article-table-editor" } }),
    TableRow,
    TableHeader.extend({ content: CELL_CONTENT }),
    TableCell.extend({ content: CELL_CONTENT }),
    Details.configure({ persist: true, HTMLAttributes: { class: "article-toggle" } }),
    DetailsSummary,
    DetailsContent,
    Callout,
    ArticleImage,
    ArticleEmbed,
    ArticleBookmark,
    Placeholder.configure({
      includeChildren: true,
      placeholder: ({ node }) => {
        const callbacks = getCallbacks();
        if (node.type.name === "heading") return callbacks.placeholder("heading");
        if (node.type.name === "detailsSummary") return callbacks.placeholder("summary");
        return callbacks.placeholder("paragraph");
      },
    }),
    FileHandler.configure({
      allowedMimeTypes: IMAGE_MIME_TYPES,
      onPaste: (_editor, files) => getCallbacks().onFiles(files),
      onDrop: (_editor, files, pos) => getCallbacks().onFiles(files, pos),
    }),
    SlashCommand.configure({
      getItems: () => getCallbacks().slashItems(),
      getLabels: () => getCallbacks().slashLabels(),
    }),
    shortcuts(getCallbacks),
    pasteGuard(getCallbacks),
  ];
}
