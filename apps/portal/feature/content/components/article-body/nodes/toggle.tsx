import type { ReactNode } from "react";

/** Native `<details><summary>`, so it works with no JavaScript. */
export function Toggle({ open, summary, children }: { open?: boolean; summary: ReactNode; children: ReactNode }) {
  return (
    <details open={open || undefined} className="article-toggle">
      <summary>{summary}</summary>
      <div className="article-toggle-content">{children}</div>
    </details>
  );
}
