import type { Ref } from "react";
import type { ArticleDoc, BodyImageMap } from "@/feature/content";

/**
 * Contract between the article editor page (`components/article-editor-page.tsx`)
 * and the Tiptap editor (`editor/article-editor.tsx`, loaded with
 * `next/dynamic(..., { ssr: false })`). ADR-009 §5.
 */
export interface ArticleEditorStats {
  words: number;
  characters: number;
}

export interface ArticleEditorHandle {
  /** Current body, normalised to the allowlist (`normalizeDoc`). */
  getJSON(): ArticleDoc;
  /** Replaces the whole body (restore a local copy, reload after a conflict). */
  setContent(doc: ArticleDoc): void;
  focus(): void;
  /**
   * Scrolls to and selects the block at an API error path such as
   * `body.content[12]` (ADR-009 §6 "Validation errors"). Returns false when
   * the path does not point at a block.
   */
  scrollToPath(path: string): boolean;
}

export interface ArticleEditorProps {
  /** Initial body; later changes to this prop are ignored (use `setContent`). */
  initialContent: ArticleDoc;
  /**
   * Known images by id (from `AdminArticle.images`). The editor adds images
   * it inserts (picker / upload) and reports the full map in `onImagesChange`,
   * so the preview can render them.
   */
  images: BodyImageMap;
  onImagesChange?: (images: BodyImageMap) => void;
  /** Called on every document change with the normalised body. */
  onChange: (doc: ArticleDoc) => void;
  onStats?: (stats: ArticleEditorStats) => void;
  /** `Ctrl+S` / `Cmd+S` inside the editor. */
  onSaveShortcut?: () => void;
  placeholder?: string;
  editable?: boolean;
  editorRef?: Ref<ArticleEditorHandle>;
}
