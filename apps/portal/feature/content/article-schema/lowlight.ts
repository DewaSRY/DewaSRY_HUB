import { createLowlight } from "lowlight";
import type { LanguageFn } from "highlight.js";
import bash from "highlight.js/lib/languages/bash";
import css from "highlight.js/lib/languages/css";
import diff from "highlight.js/lib/languages/diff";
import dockerfile from "highlight.js/lib/languages/dockerfile";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import kotlin from "highlight.js/lib/languages/kotlin";
import markdown from "highlight.js/lib/languages/markdown";
import nginx from "highlight.js/lib/languages/nginx";
import plaintext from "highlight.js/lib/languages/plaintext";
import python from "highlight.js/lib/languages/python";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

/**
 * highlight.js has no HCL grammar, so Terraform gets a small one here:
 * comments, strings with `${…}` interpolation, numbers, block keywords, and
 * attribute names.
 */
const hcl: LanguageFn = (hljs) => {
  const interpolation = { className: "subst", begin: /\$\{/, end: /\}/ };
  return {
    name: "HCL",
    aliases: ["terraform", "tf"],
    keywords: {
      keyword:
        "resource data variable output module provider locals terraform backend for in if else endif endfor dynamic content moved import check",
      literal: "true false null",
      built_in:
        "count for_each depends_on lifecycle source version providers var local each self path",
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: "string",
        begin: /"/,
        end: /"/,
        contains: [hljs.BACKSLASH_ESCAPE, interpolation],
      },
      { className: "string", begin: /<<-?\s*([A-Z_]+)/, end: /^\s*[A-Z_]+\s*$/m, contains: [interpolation] },
      { className: "number", begin: /\b\d+(\.\d+)?\b/ },
      { className: "attr", begin: /\b[a-zA-Z_][\w-]*(?=\s*=[^=])/ },
    ],
  };
};

/**
 * One lowlight instance with only the ADR-009 §7.4 grammars, shared by the
 * editor (code-block-lowlight) and the public renderer.
 */
export const lowlight = createLowlight({
  bash,
  css,
  diff,
  dockerfile,
  go,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  nginx,
  plaintext,
  python,
  sql,
  typescript,
  xml,
  yaml,
  hcl,
});

lowlight.registerAlias({ xml: ["html"], bash: ["sh", "shell"], hcl: ["terraform", "tf"] });

/** The registered grammar for a stored language, or `null` for plain text. */
export function grammarFor(language: string | null | undefined): string | null {
  if (!language || language === "plaintext") return null;
  return lowlight.registered(language) ? language : null;
}
