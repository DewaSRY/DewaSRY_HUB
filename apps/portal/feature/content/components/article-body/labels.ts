/** Text the server-rendered body needs; pages pass translated values. */
export interface ArticleBodyLabels {
  copy: string;
  copied: string;
  codeLanguage: string;
  plainText: string;
  loadEmbed: string;
  embedNotice: string;
  opensInNewTab: string;
  callout: Record<"info" | "tip" | "warning" | "danger", string>;
  headingAnchor: string;
  advertisement: string;
  taskDone: string;
  taskTodo: string;
}

export const DEFAULT_LABELS: ArticleBodyLabels = {
  copy: "Copy",
  copied: "Copied",
  codeLanguage: "Language",
  plainText: "Plain text",
  loadEmbed: "Load {{provider}}",
  embedNotice: "Loads content from {{provider}}",
  opensInNewTab: "(opens in a new tab)",
  callout: { info: "Note", tip: "Tip", warning: "Warning", danger: "Danger" },
  headingAnchor: "Link to this section",
  advertisement: "Advertisement",
  taskDone: "Done",
  taskTodo: "To do",
};
