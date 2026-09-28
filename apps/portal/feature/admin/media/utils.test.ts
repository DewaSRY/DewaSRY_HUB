import { describe, expect, it } from "vitest";
import { altFromFileName, checkImageFile, thumbnailUrl } from "./utils";

describe("media utils", () => {
  it("suggests alt text from the file name", () => {
    expect(altFromFileName("my-diagram_v2.png")).toBe("My diagram v2");
    expect(altFromFileName(".png")).toBe("");
  });
  it("checks type and size", () => {
    expect(checkImageFile({ type: "image/png", size: 100 })).toBeNull();
    expect(checkImageFile({ type: "image/gif", size: 100 })).toBe("type");
    expect(checkImageFile({ type: "image/jpeg", size: 11 * 1024 * 1024 })).toBe("size");
  });
  it("picks a thumbnail", () => {
    const image = { variants: [{ width: 1600, url: "l" }, { width: 480, url: "s" }, { width: 960, url: "m" }] };
    expect(thumbnailUrl(image)).toBe("s");
    expect(thumbnailUrl(image, 900)).toBe("m");
    expect(thumbnailUrl({ variants: [] })).toBeNull();
  });
});
