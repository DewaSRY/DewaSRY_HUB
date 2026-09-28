/**
 * The code languages the editor and the renderer register (ADR-009 §7.4).
 * Anything else renders as plain text. `html` is highlighted with the `xml`
 * grammar and `hcl` covers Terraform.
 */
export const CODE_LANGUAGES = [
  "bash",
  "css",
  "diff",
  "dockerfile",
  "go",
  "html",
  "java",
  "javascript",
  "json",
  "kotlin",
  "markdown",
  "nginx",
  "python",
  "sql",
  "typescript",
  "yaml",
  "hcl",
  "plaintext",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  bash: "Bash",
  css: "CSS",
  diff: "Diff",
  dockerfile: "Dockerfile",
  go: "Go",
  html: "HTML",
  java: "Java",
  javascript: "JavaScript",
  json: "JSON",
  kotlin: "Kotlin",
  markdown: "Markdown",
  nginx: "Nginx",
  python: "Python",
  sql: "SQL",
  typescript: "TypeScript",
  yaml: "YAML",
  hcl: "HCL / Terraform",
  plaintext: "Plain text",
};

export function isCodeLanguage(value: unknown): value is CodeLanguage {
  return typeof value === "string" && (CODE_LANGUAGES as readonly string[]).includes(value);
}
