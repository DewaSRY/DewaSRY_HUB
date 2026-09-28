import type { ReactNode } from "react";

/** Horizontally scrollable table wrapper with edge shadows (see `.article-table` in globals.css). */
export function TableFrame({ colWidths, children }: { colWidths: (number | null)[]; children: ReactNode }) {
  const hasWidths = colWidths.some((width) => width);
  return (
    <div className="article-table not-prose" role="region" tabIndex={0}>
      <table>
        {hasWidths ? (
          <colgroup>
            {colWidths.map((width, index) => (
              <col key={index} style={width ? { width: `${width}px`, minWidth: `${width}px` } : undefined} />
            ))}
          </colgroup>
        ) : null}
        {children}
      </table>
    </div>
  );
}
