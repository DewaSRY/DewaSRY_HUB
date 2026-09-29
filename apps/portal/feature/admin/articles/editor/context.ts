"use client";

import { createContext, useContext } from "react";
import type { BodyImageMap } from "@/feature/content";

export interface BookmarkAttrs {
  url: string;
  title?: string | null;
  description?: string | null;
  siteName?: string | null;
}

/**
 * Editor-level actions the toolbar, slash menu, and node views call. They
 * open the dialogs owned by `article-editor.tsx`. `replacePos` is the
 * position of an existing node to replace instead of inserting a new one.
 */
export interface EditorActions {
  openImagePicker: (options?: { replacePos?: number }) => void;
  openEmbed: (options?: { url?: string; replacePos?: number }) => void;
  openLinkCard: (options?: { replacePos?: number; attrs?: BookmarkAttrs }) => void;
  openLink: () => void;
  openTable: () => void;
  /** Paste / drop of image files: opens the upload dialog (alt text is required). */
  uploadFiles: (files: File[], pos?: number) => void;
}

export interface EditorUi {
  /** Known body images by id, for the image node view. */
  images: BodyImageMap;
  actions: EditorActions;
}

const noop = () => undefined;

export const EditorUiContext = createContext<EditorUi>({
  images: {},
  actions: {
    openImagePicker: noop,
    openEmbed: noop,
    openLinkCard: noop,
    openLink: noop,
    openTable: noop,
    uploadFiles: noop,
  },
});

export function useEditorUi(): EditorUi {
  return useContext(EditorUiContext);
}
