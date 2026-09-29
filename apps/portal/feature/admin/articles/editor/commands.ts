import type { Editor, Range } from "@tiptap/core";
import {
  CodeXml,
  Heading2,
  Heading3,
  Heading4,
  Image,
  Link2,
  List,
  ListChecks,
  ListCollapse,
  ListOrdered,
  Megaphone,
  Minus,
  Pilcrow,
  Quote,
  Table,
  SquarePlay,
  type LucideIcon,
} from "lucide-react";
import type { EditorActions } from "./context";

/**
 * Block commands shared by the fixed toolbar, the `/` slash menu, and the
 * drag-handle "Turn into" menu (ADR-009 §5.3). Labels are i18n keys
 * (`editor.blocks.<id>`), resolved by the menus.
 */
export type BlockId =
  | "paragraph"
  | "heading2"
  | "heading3"
  | "heading4"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "callout"
  | "details"
  | "image"
  | "embed"
  | "bookmark"
  | "table";

export interface BlockCommand {
  id: BlockId;
  icon: LucideIcon;
  /** English search words for the slash menu, in addition to the translated label. */
  keywords: readonly string[];
  /** Markdown shortcut shown in the slash menu. */
  hint?: string;
}

export const BLOCK_COMMANDS: readonly BlockCommand[] = [
  { id: "paragraph", icon: Pilcrow, keywords: ["text", "paragraph", "teks"] },
  { id: "heading2", icon: Heading2, keywords: ["h2", "heading", "title", "judul"], hint: "##" },
  { id: "heading3", icon: Heading3, keywords: ["h3", "heading", "subtitle", "judul"], hint: "###" },
  { id: "heading4", icon: Heading4, keywords: ["h4", "heading", "judul"], hint: "####" },
  { id: "bulletList", icon: List, keywords: ["ul", "bullet", "list", "daftar"], hint: "-" },
  { id: "orderedList", icon: ListOrdered, keywords: ["ol", "numbered", "ordered", "list", "daftar"], hint: "1." },
  { id: "taskList", icon: ListChecks, keywords: ["todo", "task", "checkbox", "check"], hint: "[ ]" },
  { id: "blockquote", icon: Quote, keywords: ["quote", "blockquote", "kutipan"], hint: ">" },
  { id: "codeBlock", icon: CodeXml, keywords: ["code", "snippet", "kode"], hint: "```" },
  { id: "horizontalRule", icon: Minus, keywords: ["divider", "hr", "rule", "separator", "pemisah"], hint: "---" },
  { id: "callout", icon: Megaphone, keywords: ["callout", "note", "tip", "warning", "catatan"] },
  { id: "details", icon: ListCollapse, keywords: ["toggle", "details", "collapse", "accordion"] },
  { id: "image", icon: Image, keywords: ["image", "picture", "photo", "gambar", "media"] },
  { id: "embed", icon: SquarePlay, keywords: ["embed", "video", "youtube", "vimeo", "figma", "codesandbox"] },
  { id: "bookmark", icon: Link2, keywords: ["link", "card", "bookmark", "tautan"] },
  { id: "table", icon: Table, keywords: ["table", "grid", "tabel"] },
];

/** Blocks the text block type can be turned into (toolbar dropdown, drag menu). */
export const TURN_INTO: readonly BlockId[] = [
  "paragraph",
  "heading2",
  "heading3",
  "heading4",
  "bulletList",
  "orderedList",
  "taskList",
  "blockquote",
  "codeBlock",
  "callout",
];

export const blockCommand = (id: BlockId) => BLOCK_COMMANDS.find((command) => command.id === id)!;

/**
 * Runs a block command. `range` is the `/query` text to delete first (slash
 * menu). Image, embed, link card, and table open their dialog.
 */
export function runBlockCommand(editor: Editor, id: BlockId, actions: EditorActions, range?: Range): void {
  const chain = editor.chain().focus();
  if (range) chain.deleteRange(range);
  switch (id) {
    case "paragraph":
      chain.setParagraph().run();
      return;
    case "heading2":
    case "heading3":
    case "heading4":
      chain.setHeading({ level: Number(id.slice(-1)) as 2 | 3 | 4 }).run();
      return;
    case "bulletList":
      chain.toggleBulletList().run();
      return;
    case "orderedList":
      chain.toggleOrderedList().run();
      return;
    case "taskList":
      chain.toggleTaskList().run();
      return;
    case "blockquote":
      chain.toggleBlockquote().run();
      return;
    case "codeBlock":
      chain.toggleCodeBlock().run();
      return;
    case "horizontalRule":
      chain.setHorizontalRule().run();
      return;
    case "callout":
      chain.toggleCallout().run();
      return;
    case "details":
      chain.setDetails().run();
      return;
    case "image":
      chain.run();
      actions.openImagePicker();
      return;
    case "embed":
      chain.run();
      actions.openEmbed();
      return;
    case "bookmark":
      chain.run();
      actions.openLinkCard();
      return;
    case "table":
      chain.run();
      actions.openTable();
      return;
  }
}

/** The block type under the cursor, for the toolbar's "Text ▾" dropdown. */
export function activeBlock(editor: Editor): BlockId {
  if (editor.isActive("heading", { level: 2 })) return "heading2";
  if (editor.isActive("heading", { level: 3 })) return "heading3";
  if (editor.isActive("heading", { level: 4 })) return "heading4";
  if (editor.isActive("codeBlock")) return "codeBlock";
  if (editor.isActive("taskList")) return "taskList";
  if (editor.isActive("orderedList")) return "orderedList";
  if (editor.isActive("bulletList")) return "bulletList";
  if (editor.isActive("blockquote")) return "blockquote";
  if (editor.isActive("callout")) return "callout";
  return "paragraph";
}
