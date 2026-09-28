import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { collectImageIds } from "../../article-schema/allowlist";
import type { ArticleDoc, BodyImageMap } from "../../article-schema/types";
import type { SkippedNode } from "./context";
import { renderDoc } from "./article-body";

vi.mock("next/navigation", () => ({ useParams: () => ({ locale: "en" }) }));

const CONTRACTS = path.resolve(__dirname, "../../../../../../contracts/article");
const kitchenSink = JSON.parse(readFileSync(path.join(CONTRACTS, "kitchen-sink.v1.json"), "utf8")) as ArticleDoc;

function imagesFor(doc: ArticleDoc): BodyImageMap {
  return Object.fromEntries(
    collectImageIds(doc).map((id) => [
      id,
      {
        id,
        alt: `Library alt ${id.slice(0, 4)}`,
        width: 1600,
        height: 900,
        variants: [480, 960, 1600].map((width) => ({ width, url: `https://cdn.example/images/${id}/${width}.webp` })),
      },
    ]),
  );
}

function render(doc: unknown, options: Parameters<typeof renderDoc>[1] = {}) {
  const skipped: SkippedNode[] = [];
  const html = renderToStaticMarkup(
    <div>{renderDoc(doc as ArticleDoc, { images: imagesFor(kitchenSink), onSkip: (s) => skipped.push(s), ...options })}</div>,
  );
  return { html, skipped };
}

describe("renderDoc — kitchen sink", () => {
  const { html, skipped } = render(kitchenSink, { renderAdSlot: (id) => <div data-ad-slot={id} /> });

  it("renders every node without skipping anything", () => {
    expect(skipped).toEqual([]);
  });

  it("renders headings with ids, anchors, and no <h1>", () => {
    expect(html).toContain('<h2 id="why-graviton"');
    expect(html).toContain('<h2 id="why-graviton-2"');
    expect(html).toContain('<h3 id="setup"');
    expect(html).toContain('<h4 id="terraform"');
    expect(html).toContain('href="#why-graviton"');
    expect(html).not.toContain("<h1");
  });

  it("renders every mark", () => {
    for (const tag of ["<strong>", "<em>", "<u>", "<s>", "<code>", "<sub>", "<sup>"]) expect(html).toContain(tag);
    expect(html).toContain('<mark class="content-highlight" data-color="yellow">');
    expect(html).toContain('<span class="content-color" data-color="green">');
  });

  it("renders links safely", () => {
    expect(html).toContain('href="https://aws.amazon.com/ec2/graviton/" target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('href="/en/about"');
    expect(html).toContain('href="#setup"');
    expect(html).toContain('href="mailto:hello@example.com"');
  });

  it("renders lists, tasks, quote, rule, callouts, toggle", () => {
    expect(html).toContain('<ol start="3">');
    expect(html).toMatch(/<input type="checkbox" disabled="" [^>]*checked=""/);
    expect(html).toContain("<blockquote>");
    expect(html).toContain("<hr/>");
    for (const tone of ["info", "tip", "warning", "danger"]) expect(html).toContain(`data-tone="${tone}"`);
    expect(html).toContain('<details open="" class="article-toggle"><summary>Show the full config</summary>');
  });

  it("highlights code on the server and labels it", () => {
    expect(html).toContain('class="hljs language-typescript"');
    expect(html).toContain('<span class="hljs-keyword">export</span>');
    expect(html).toContain("TypeScript");
  });

  it("renders images with srcset, sizes, width, height, and lazy loading", () => {
    expect(html).toContain('srcSet="https://cdn.example/images/5b2e0c1a-8d3f-4a6b-9c7e-1f2a3b4c5d6e/480.webp 480w');
    expect(html).toContain('sizes="(min-width: 1024px) 960px, 100vw"');
    expect(html).toContain('width="1600" height="900"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('alt="Architecture diagram override"');
    expect(html).toContain("<figcaption");
    expect(html).toContain('data-width="full"');
  });

  it("renders embeds as click-to-load facades without iframes", () => {
    expect(html).not.toContain("<iframe");
    expect(html).toContain("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
    expect(html).toContain("Load YouTube");
    expect(html).toContain("Load Vimeo");
    expect(html).toContain("Load CodeSandbox");
    expect(html).toContain("Load Figma");
  });

  it("renders the link card without a remote image", () => {
    expect(html).toContain('href="https://opennext.js.org/cloudflare"');
    expect(html).toContain("opennext.js.org");
  });

  it("renders tables with a header row, spans, and column widths", () => {
    expect(html).toContain('<thead><tr><th scope="col">');
    expect(html).toContain('rowSpan="2"');
    expect(html).toContain('colSpan="2"');
    expect(html).toContain('style="width:160px;min-width:160px"');
  });

  it("places in-article ad slots between top-level blocks", () => {
    expect(html).toContain('data-ad-slot="in-article-1"');
    expect(html).toContain('data-ad-slot="in-article-2"');
    expect(html).toContain('data-ad-slot="in-article-3"');
  });

  it("never outputs raw HTML", () => {
    expect(html).not.toContain("<script");
    expect(html).not.toMatch(/ on[a-z]+=/);
  });
});

describe("renderDoc — hostile input", () => {
  it("skips unknown nodes and marks, and bad attributes, without crashing", () => {
    const { html, skipped } = render({
      type: "doc",
      content: [
        { type: "iframe", attrs: { src: "https://evil.example" } },
        { type: "paragraph", content: [{ type: "text", text: "hi", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }, { type: "blink" }] }] },
        { type: "image", attrs: { imageId: "00000000-0000-0000-0000-000000000000" } },
        { type: "embed", attrs: { provider: "youtube", id: "\"><script>" } },
        { type: "bookmark", attrs: { url: "javascript:alert(1)" } },
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "x" }] },
        { type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] },
      ],
    });
    expect(skipped.map((s) => s.path).sort()).toEqual([
      "body.content[0]",
      "body.content[1].content[0].marks[0]",
      "body.content[1].content[0].marks[1]",
      "body.content[2]",
      "body.content[3]",
      "body.content[4]",
      "body.content[5]",
    ]);
    expect(html).toContain("<p>hi</p>");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("returns nothing for a non-doc body", () => {
    const { html, skipped } = render({ type: "paragraph" });
    expect(html).toBe("<div></div>");
    expect(skipped).toEqual([{ path: "body", reason: "body is not a doc node" }]);
  });
});
