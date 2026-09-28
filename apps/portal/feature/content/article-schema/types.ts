/**
 * Article body format (ADR-009 §4): Tiptap / ProseMirror JSON limited to the
 * allowlist in §4.2. These types describe what the API stores and returns;
 * the renderer still treats input as untrusted and re-checks every attribute.
 */

export type TextAlign = "left" | "center" | "right";
export type HeadingLevel = 2 | 3 | 4;
export type CalloutTone = "info" | "tip" | "warning" | "danger";
export type ImageWidth = "content" | "wide" | "full";
export type EmbedProvider = "youtube" | "vimeo" | "codesandbox" | "figma";
export type PaletteKey =
  | "gray"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink";

export type Mark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "strike" }
  | { type: "code" }
  | { type: "subscript" }
  | { type: "superscript" }
  | { type: "link"; attrs: { href: string } }
  | { type: "textColor"; attrs: { color: PaletteKey } }
  | { type: "highlight"; attrs: { color: PaletteKey } };

export type MarkType = Mark["type"];

export interface TextNode {
  type: "text";
  text: string;
  marks?: Mark[];
}

export interface HardBreakNode {
  type: "hardBreak";
}

export type InlineNode = TextNode | HardBreakNode;

export interface ParagraphNode {
  type: "paragraph";
  attrs?: { textAlign?: TextAlign | null };
  content?: InlineNode[];
}

export interface HeadingNode {
  type: "heading";
  attrs: { level: HeadingLevel; textAlign?: TextAlign | null };
  content?: InlineNode[];
}

export interface ListItemNode {
  type: "listItem";
  content: BlockNode[];
}

export interface BulletListNode {
  type: "bulletList";
  content: ListItemNode[];
}

export interface OrderedListNode {
  type: "orderedList";
  attrs?: { start?: number };
  content: ListItemNode[];
}

export interface TaskItemNode {
  type: "taskItem";
  attrs: { checked: boolean };
  content: BlockNode[];
}

export interface TaskListNode {
  type: "taskList";
  content: TaskItemNode[];
}

export interface BlockquoteNode {
  type: "blockquote";
  content: BlockNode[];
}

export interface CodeBlockNode {
  type: "codeBlock";
  attrs?: { language?: string | null };
  content?: TextNode[];
}

export interface HorizontalRuleNode {
  type: "horizontalRule";
}

export interface CalloutNode {
  type: "callout";
  attrs: { tone: CalloutTone };
  content: BlockNode[];
}

export interface DetailsSummaryNode {
  type: "detailsSummary";
  content?: InlineNode[];
}

export interface DetailsContentNode {
  type: "detailsContent";
  content: BlockNode[];
}

export interface DetailsNode {
  type: "details";
  attrs?: { open?: boolean };
  content: [DetailsSummaryNode, DetailsContentNode] | (DetailsSummaryNode | DetailsContentNode)[];
}

export interface ImageNode {
  type: "image";
  attrs: {
    imageId: string;
    alt?: string | null;
    caption?: string | null;
    width?: ImageWidth;
  };
}

export interface EmbedNode {
  type: "embed";
  attrs: { provider: EmbedProvider; id: string; caption?: string | null };
}

export interface BookmarkNode {
  type: "bookmark";
  attrs: {
    url: string;
    title?: string | null;
    description?: string | null;
    siteName?: string | null;
  };
}

export interface TableCellAttrs {
  colspan?: number;
  rowspan?: number;
  colwidth?: number[] | null;
}

export interface TableCellNode {
  type: "tableCell";
  attrs?: TableCellAttrs;
  content: BlockNode[];
}

export interface TableHeaderNode {
  type: "tableHeader";
  attrs?: TableCellAttrs;
  content: BlockNode[];
}

export interface TableRowNode {
  type: "tableRow";
  content: (TableCellNode | TableHeaderNode)[];
}

export interface TableNode {
  type: "table";
  content: TableRowNode[];
}

export type BlockNode =
  | ParagraphNode
  | HeadingNode
  | BulletListNode
  | OrderedListNode
  | TaskListNode
  | BlockquoteNode
  | CodeBlockNode
  | HorizontalRuleNode
  | CalloutNode
  | DetailsNode
  | ImageNode
  | EmbedNode
  | BookmarkNode
  | TableNode;

export type AnyNode =
  | BlockNode
  | InlineNode
  | ListItemNode
  | TaskItemNode
  | DetailsSummaryNode
  | DetailsContentNode
  | TableRowNode
  | TableCellNode
  | TableHeaderNode;

export type NodeType = AnyNode["type"] | "doc";

export interface ArticleDoc {
  type: "doc";
  content: BlockNode[];
}

/** A loosely-typed node as it arrives over the wire (validated before use). */
export interface RawNode {
  type?: unknown;
  attrs?: Record<string, unknown>;
  content?: unknown;
  marks?: unknown;
  text?: unknown;
}

/** One entry of the `images` map returned next to the body (ADR-009 §4.3). */
export interface BodyImage {
  id: string;
  alt: string;
  width: number;
  height: number;
  variants: { width: number; url: string }[];
}

export type BodyImageMap = Record<string, BodyImage>;

export const EMPTY_DOC: ArticleDoc = { type: "doc", content: [] };

export const BODY_SCHEMA_VERSION = 1;
