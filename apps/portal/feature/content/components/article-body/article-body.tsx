import { Fragment, type ReactNode } from "react";
import { isHttpsUrl } from "../../article-schema/allowlist";
import { EMBED_PROVIDERS, isEmbedProvider, isValidEmbedId } from "../../article-schema/embed-providers";
import type { ArticleDoc, BodyImageMap, RawNode } from "../../article-schema/types";
import { planInArticleSlots, inArticleSlotId } from "../../utils/ad-slots";
import { HeadingIdAllocator } from "../../utils/heading-id";
import { inlineText } from "../../utils/text";
import { renderMarks } from "./marks";
import { DEFAULT_LABELS, type ArticleBodyLabels } from "./labels";
import type { RenderContext, RenderDocOptions, SkippedNode } from "./context";
import { Bookmark } from "./nodes/bookmark";
import { Callout } from "./nodes/callout";
import { CodeBlock } from "./nodes/code-block";
import { EmbedFacade } from "./nodes/embed-facade";
import { Figure } from "./nodes/figure";
import { Heading } from "./nodes/heading-anchor";
import { TableFrame } from "./nodes/table";
import { Toggle } from "./nodes/toggle";

/**
 * Public renderer (ADR-009 §7): a plain recursive `switch` over the
 * allowlist that returns React elements. No `dangerouslySetInnerHTML`, no
 * Tiptap/ProseMirror code. Unknown node or mark types — and allowlisted ones
 * with invalid attributes — are skipped and reported through `onSkip`; they
 * never crash the page and never render as raw content.
 *
 * Runs on the server for `/blog/[slug]` and in the browser for the admin
 * preview (same output).
 */

const ALIGN: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

function alignClass(attrs: Record<string, unknown> | undefined): string | undefined {
  const value = attrs?.textAlign;
  return typeof value === "string" && value !== "left" ? ALIGN[value] : undefined;
}

function asNodes(content: unknown): RawNode[] {
  return Array.isArray(content) ? (content as RawNode[]) : [];
}

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? "");
}

function renderChildren(content: unknown, ctx: RenderContext, path: string): ReactNode[] {
  return asNodes(content).map((child, index) => renderNode(child, ctx, `${path}.content[${index}]`, index));
}

function renderInline(content: unknown, ctx: RenderContext, path: string): ReactNode[] {
  return asNodes(content).map((child, index) => {
    const childPath = `${path}.content[${index}]`;
    const key = `i${index}`;
    if (child?.type === "text") {
      if (typeof child.text !== "string") {
        ctx.skip(childPath, "text without a string");
        return null;
      }
      return <Fragment key={key}>{renderMarks(child.text, child.marks, key, ctx, childPath)}</Fragment>;
    }
    if (child?.type === "hardBreak") return <br key={key} />;
    ctx.skip(childPath, `inline node ${String(child?.type)} is not allowed`);
    return null;
  });
}

function renderTable(node: RawNode, ctx: RenderContext, path: string, key: string): ReactNode {
  const rows = asNodes(node.content).filter((row, index) => {
    if (row?.type === "tableRow") return true;
    ctx.skip(`${path}.content[${index}]`, "table child is not a tableRow");
    return false;
  });
  if (rows.length === 0) {
    ctx.skip(path, "empty table");
    return null;
  }
  const firstCells = asNodes(rows[0]?.content);
  const headerRow = firstCells.length > 0 && firstCells.every((cell) => cell?.type === "tableHeader");
  const colWidths: (number | null)[] = [];
  for (const cell of firstCells) {
    const attrs = cell?.attrs ?? {};
    const span = Number.isInteger(attrs.colspan) ? (attrs.colspan as number) : 1;
    const widths = Array.isArray(attrs.colwidth) ? (attrs.colwidth as unknown[]) : [];
    for (let i = 0; i < span; i++) {
      const width = widths[i];
      colWidths.push(typeof width === "number" && width > 0 ? width : null);
    }
  }

  const renderRow = (row: RawNode, rowIndex: number, inHead: boolean) => {
    const rowPath = `${path}.content[${rowIndex}]`;
    return (
      <tr key={`r${rowIndex}`}>
        {asNodes(row.content).map((cell, cellIndex) => {
          const cellPath = `${rowPath}.content[${cellIndex}]`;
          if (cell?.type !== "tableCell" && cell?.type !== "tableHeader") {
            ctx.skip(cellPath, "row child is not a cell");
            return null;
          }
          const attrs = cell.attrs ?? {};
          const colSpan = Number.isInteger(attrs.colspan) && (attrs.colspan as number) > 1 ? (attrs.colspan as number) : undefined;
          const rowSpan = Number.isInteger(attrs.rowspan) && (attrs.rowspan as number) > 1 ? (attrs.rowspan as number) : undefined;
          const children = renderChildren(cell.content, ctx, cellPath);
          if (cell.type === "tableHeader") {
            return (
              <th key={`c${cellIndex}`} scope={inHead ? "col" : "row"} colSpan={colSpan} rowSpan={rowSpan}>
                {children}
              </th>
            );
          }
          return (
            <td key={`c${cellIndex}`} colSpan={colSpan} rowSpan={rowSpan}>
              {children}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <TableFrame key={key} colWidths={colWidths}>
      {headerRow ? <thead>{renderRow(rows[0], 0, true)}</thead> : null}
      <tbody>{rows.map((row, index) => (headerRow && index === 0 ? null : renderRow(row, index, false)))}</tbody>
    </TableFrame>
  );
}

function renderNode(node: RawNode, ctx: RenderContext, path: string, index: number): ReactNode {
  const key = `n${index}`;
  const attrs = (node?.attrs ?? {}) as Record<string, unknown>;
  switch (node?.type) {
    case "paragraph":
      return (
        <p key={key} className={alignClass(attrs)}>
          {renderInline(node.content, ctx, path)}
        </p>
      );

    case "heading": {
      const level = attrs.level;
      if (level !== 2 && level !== 3 && level !== 4) {
        ctx.skip(path, "heading level must be 2, 3, or 4");
        return null;
      }
      const topLevel = /^body\.content\[(\d+)\]$/.exec(path);
      const id =
        (topLevel ? ctx.topLevelHeadingIds.get(Number(topLevel[1])) : undefined) ??
        ctx.headingIds.next(inlineText(node));
      return (
        <Heading key={key} level={level} id={id} align={alignClass(attrs)} anchorLabel={ctx.labels.headingAnchor}>
          {renderInline(node.content, ctx, path)}
        </Heading>
      );
    }

    case "bulletList":
      return <ul key={key}>{renderChildren(node.content, ctx, path)}</ul>;

    case "orderedList": {
      const start = Number.isInteger(attrs.start) && (attrs.start as number) > 1 ? (attrs.start as number) : undefined;
      return (
        <ol key={key} start={start}>
          {renderChildren(node.content, ctx, path)}
        </ol>
      );
    }

    case "listItem":
      return <li key={key}>{renderChildren(node.content, ctx, path)}</li>;

    case "taskList":
      return (
        <ul key={key} className="task-list" data-type="taskList">
          {renderChildren(node.content, ctx, path)}
        </ul>
      );

    case "taskItem": {
      const checked = attrs.checked === true;
      return (
        <li key={key} className="task-item" data-checked={checked}>
          <input
            type="checkbox"
            checked={checked}
            disabled
            readOnly
            aria-label={checked ? ctx.labels.taskDone : ctx.labels.taskTodo}
          />
          <div className="task-item-content">{renderChildren(node.content, ctx, path)}</div>
        </li>
      );
    }

    case "blockquote":
      return <blockquote key={key}>{renderChildren(node.content, ctx, path)}</blockquote>;

    case "codeBlock": {
      const code = asNodes(node.content)
        .map((child) => (child?.type === "text" && typeof child.text === "string" ? child.text : ""))
        .join("");
      const language = typeof attrs.language === "string" ? attrs.language : null;
      return <CodeBlock key={key} code={code} language={language} labels={ctx.labels} />;
    }

    case "horizontalRule":
      return <hr key={key} />;

    case "callout": {
      const tone = attrs.tone;
      if (tone !== "info" && tone !== "tip" && tone !== "warning" && tone !== "danger") {
        ctx.skip(path, "callout with an unknown tone");
        return null;
      }
      return (
        <Callout key={key} tone={tone} label={ctx.labels.callout[tone]}>
          {renderChildren(node.content, ctx, path)}
        </Callout>
      );
    }

    case "details": {
      const children = asNodes(node.content);
      const summaryIndex = children.findIndex((child) => child?.type === "detailsSummary");
      const contentIndex = children.findIndex((child) => child?.type === "detailsContent");
      children.forEach((child, childIndex) => {
        if (child?.type !== "detailsSummary" && child?.type !== "detailsContent") {
          ctx.skip(`${path}.content[${childIndex}]`, "details child must be a summary or content");
        }
      });
      const summaryPath = `${path}.content[${summaryIndex}]`;
      const contentPath = `${path}.content[${contentIndex}]`;
      return (
        <Toggle
          key={key}
          open={attrs.open === true}
          summary={summaryIndex >= 0 ? renderInline(children[summaryIndex].content, ctx, summaryPath) : null}
        >
          {contentIndex >= 0 ? renderChildren(children[contentIndex].content, ctx, contentPath) : null}
        </Toggle>
      );
    }

    case "image": {
      const imageId = attrs.imageId;
      const image = typeof imageId === "string" ? ctx.images[imageId] : undefined;
      if (!image) {
        ctx.skip(path, "image id is missing from the images map");
        return null;
      }
      const width = attrs.width === "wide" || attrs.width === "full" ? attrs.width : "content";
      return (
        <Figure
          key={key}
          image={image}
          alt={typeof attrs.alt === "string" && attrs.alt ? attrs.alt : image.alt}
          caption={typeof attrs.caption === "string" ? attrs.caption : null}
          width={width}
        />
      );
    }

    case "embed": {
      const provider = attrs.provider;
      if (!isEmbedProvider(provider) || !isValidEmbedId(provider, attrs.id)) {
        ctx.skip(path, "embed with an unknown provider or invalid id");
        return null;
      }
      const label = EMBED_PROVIDERS[provider].label;
      return (
        <EmbedFacade
          key={key}
          provider={provider}
          id={attrs.id as string}
          caption={typeof attrs.caption === "string" ? attrs.caption : null}
          loadLabel={interpolate(ctx.labels.loadEmbed, { provider: label })}
          noticeLabel={interpolate(ctx.labels.embedNotice, { provider: label })}
        />
      );
    }

    case "bookmark": {
      if (!isHttpsUrl(attrs.url)) {
        ctx.skip(path, "bookmark url must be https");
        return null;
      }
      return (
        <Bookmark
          key={key}
          url={attrs.url}
          title={typeof attrs.title === "string" ? attrs.title : null}
          description={typeof attrs.description === "string" ? attrs.description : null}
          siteName={typeof attrs.siteName === "string" ? attrs.siteName : null}
          newTabLabel={ctx.labels.opensInNewTab}
        />
      );
    }

    case "table":
      return renderTable(node, ctx, path, key);

    default:
      ctx.skip(path, `unknown node ${String(node?.type)}`);
      return null;
  }
}

function defaultOnSkip(skipped: SkippedNode) {
  console.warn(JSON.stringify({ level: "warn", message: "article_body_skipped", ...skipped }));
}

/**
 * Renders a body to React nodes, with in-article ad slots between top-level
 * blocks (ADR-009 §7.5) when `renderAdSlot` is given.
 */
export function renderDoc(doc: ArticleDoc | null | undefined, options: RenderDocOptions = {}): ReactNode[] {
  const labels: ArticleBodyLabels = {
    ...DEFAULT_LABELS,
    ...options.labels,
    callout: { ...DEFAULT_LABELS.callout, ...options.labels?.callout },
  };
  const onSkip = options.onSkip ?? defaultOnSkip;
  const blocks = asNodes((doc as { content?: unknown } | null | undefined)?.content);

  // Top-level heading ids first, in order, so they match `buildToc()`.
  const allocator = new HeadingIdAllocator();
  const topLevelHeadingIds = new Map<number, string>();
  blocks.forEach((block, index) => {
    if (block?.type === "heading") topLevelHeadingIds.set(index, allocator.next(inlineText(block)));
  });

  const ctx: RenderContext = {
    images: options.images ?? ({} as BodyImageMap),
    labels,
    headingIds: allocator,
    topLevelHeadingIds,
    skip: (path, reason) => onSkip({ path, reason }),
  };

  if (!doc || (doc as { type?: unknown }).type !== "doc") {
    if (doc) ctx.skip("body", "body is not a doc node");
    return [];
  }

  const slots = options.renderAdSlot
    ? new Map(planInArticleSlots(blocks as { type: never }[]).map((after, position) => [after, inArticleSlotId(position)]))
    : new Map<number, string>();

  const output: ReactNode[] = [];
  blocks.forEach((block, index) => {
    output.push(renderNode(block, ctx, `body.content[${index}]`, index));
    const slotId = slots.get(index);
    if (slotId && options.renderAdSlot) {
      output.push(<Fragment key={`ad-${slotId}`}>{options.renderAdSlot(slotId)}</Fragment>);
    }
  });
  return output;
}

/** `<div class="article-body prose">` around `renderDoc()`. */
export function ArticleBody({
  doc,
  className,
  ...options
}: RenderDocOptions & { doc: ArticleDoc | null | undefined; className?: string }) {
  return (
    <div className={`article-body prose prose-neutral dark:prose-invert max-w-none ${className ?? ""}`.trim()}>
      {renderDoc(doc, options)}
    </div>
  );
}
