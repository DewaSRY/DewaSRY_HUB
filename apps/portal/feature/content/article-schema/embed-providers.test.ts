import { describe, expect, it } from "vitest";
import { embedFrameSrc, parseEmbedUrl } from "./embed-providers";

describe("parseEmbedUrl", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=10", "youtube", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "youtube", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "youtube", "dQw4w9WgXcQ"],
    ["https://vimeo.com/76979871", "vimeo", "76979871"],
    ["https://player.vimeo.com/video/76979871", "vimeo", "76979871"],
    ["https://codesandbox.io/s/new-react-demo-x1y2z3", "codesandbox", "new-react-demo-x1y2z3"],
    ["https://codesandbox.io/p/sandbox/abc123", "codesandbox", "abc123"],
    ["https://www.figma.com/file/AbCdEf1234567890/My-File", "figma", "AbCdEf1234567890"],
    ["https://www.figma.com/design/AbCdEf1234567890/My-File?node-id=1", "figma", "AbCdEf1234567890"],
    ["https://www.figma.com/proto/AbCdEf1234567890/My-File", "figma", "AbCdEf1234567890"],
  ])("parses %s", (url, provider, id) => {
    expect(parseEmbedUrl(url)).toEqual({ provider, id });
  });

  it.each([
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=short",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "not a url",
    "https://vimeo.com/about",
    "https://codesandbox.io/s/UPPER_CASE",
    "https://www.figma.com/file/short",
  ])("rejects %s", (url) => {
    expect(parseEmbedUrl(url)).toBeNull();
  });

  it("builds frame URLs from provider + id only", () => {
    expect(embedFrameSrc("youtube", "dQw4w9WgXcQ")).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
    expect(embedFrameSrc("vimeo", "76979871")).toMatch(/^https:\/\/player\.vimeo\.com\/video\/76979871\?dnt=1/);
    expect(embedFrameSrc("codesandbox", "abc")).toBe("https://codesandbox.io/embed/abc");
    expect(embedFrameSrc("figma", "AbCdEf1234567890")).toContain("https://www.figma.com/embed?embed_host=dewasuryahub&url=");
    expect(embedFrameSrc("youtube", "\"><script>")).toBeNull();
    expect(embedFrameSrc("evil", "x")).toBeNull();
  });
});
