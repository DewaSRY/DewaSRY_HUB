"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { CODE_LANGUAGES, CODE_LANGUAGE_LABELS, lowlight } from "@/feature/content";
import { toCodeLanguage } from "../utils";

function CodeBlockView({ node, editor, updateAttributes }: ReactNodeViewProps) {
  const { t } = useTranslation("admin");
  const language = toCodeLanguage(node.attrs.language);
  return (
    <NodeViewWrapper className="article-code not-prose relative my-6 overflow-hidden rounded-xl border bg-muted/40">
      <div contentEditable={false} className="flex items-center justify-between border-b bg-muted/60 px-3 py-1">
        <select
          value={language ?? ""}
          disabled={!editor.isEditable}
          onChange={(event) => updateAttributes({ language: event.target.value || null })}
          aria-label={t("editor.code.language")}
          className="rounded bg-transparent py-0.5 font-mono text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="">{t("editor.code.plain")}</option>
          {CODE_LANGUAGES.filter((value) => value !== "plaintext").map((value) => (
            <option key={value} value={value}>
              {CODE_LANGUAGE_LABELS[value]}
            </option>
          ))}
        </select>
      </div>
      <pre className="overflow-x-auto p-4 text-[0.85rem] leading-relaxed">
        <NodeViewContent<"code"> as="code" className={language ? `hljs language-${language}` : "hljs"} />
      </pre>
    </NodeViewWrapper>
  );
}

/**
 * `codeBlock` with the same `lowlight` grammars as the public renderer
 * (ADR-009 §7.4) and a language picker. Unknown fence names are mapped (or
 * dropped) by `sanitizeEditorDoc`.
 */
export const ArticleCodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ lowlight, defaultLanguage: null, enableTabIndentation: true });
