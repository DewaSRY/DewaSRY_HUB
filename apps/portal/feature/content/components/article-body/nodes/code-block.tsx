import { CODE_LANGUAGE_LABELS, isCodeLanguage } from "../../../article-schema/languages";
import { grammarFor, lowlight } from "../../../article-schema/lowlight";
import { hastToReact } from "../hast";
import { CopyCodeButton } from "./copy-code-button";
import type { ArticleBodyLabels } from "../labels";

/**
 * Highlighted with `lowlight` on the server (same grammars as the editor),
 * with a language label and a Copy island. Long lines scroll sideways.
 */
export function CodeBlock({
  code,
  language,
  labels,
}: {
  code: string;
  language: string | null | undefined;
  labels: ArticleBodyLabels;
}) {
  const grammar = grammarFor(language);
  let highlighted: ReturnType<typeof hastToReact> | null = null;
  if (grammar) {
    try {
      highlighted = hastToReact(lowlight.highlight(grammar, code).children as never);
    } catch {
      highlighted = null;
    }
  }
  const label = isCodeLanguage(language) && language !== "plaintext" ? CODE_LANGUAGE_LABELS[language] : labels.plainText;

  return (
    <div className="article-code not-prose group relative my-6 overflow-hidden rounded-xl border bg-muted/40">
      <div className="flex items-center justify-between border-b bg-muted/60 px-3 py-1.5">
        <span className="font-mono text-xs text-muted-foreground" aria-label={labels.codeLanguage}>
          {label}
        </span>
        <CopyCodeButton code={code} label={labels.copy} copiedLabel={labels.copied} />
      </div>
      <pre className="overflow-x-auto p-4 text-[0.85rem] leading-relaxed">
        <code className={grammar ? `hljs language-${grammar}` : "hljs"}>{highlighted ?? code}</code>
      </pre>
    </div>
  );
}
