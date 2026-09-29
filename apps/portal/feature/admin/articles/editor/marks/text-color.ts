import { Mark, mergeAttributes } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import { isPaletteKey, type PaletteKey } from "@/feature/content";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textColor: {
      setTextColor: (color: PaletteKey) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
  }
}

const paletteAttr = (fallback: PaletteKey) => ({
  default: fallback,
  parseHTML: (element: HTMLElement) => {
    const value = element.getAttribute("data-color");
    return isPaletteKey(value) ? value : fallback;
  },
  renderHTML: (attributes: Record<string, unknown>) => ({
    "data-color": isPaletteKey(attributes.color) ? attributes.color : fallback,
  }),
});

/**
 * `textColor` mark (ADR-009 §4.5): stores a palette key, never a hex value.
 * Tiptap's `Color` extension writes inline `color:` styles, so it is not used.
 * Renders like the public page: `<span class="content-color" data-color>`.
 */
export const TextColor = Mark.create({
  name: "textColor",

  parseHTML() {
    return [{ tag: "span.content-color[data-color]" }];
  },

  addAttributes() {
    return { color: paletteAttr("gray") };
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes({ class: "content-color" }, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setTextColor:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});

/**
 * `highlight` with a palette key. The default colour is `yellow`, so the
 * `Ctrl+Shift+H` shortcut and the `==x==` input rule always produce a valid
 * mark (the allowlist requires `color`).
 */
export const PaletteHighlight = Highlight.extend({
  addAttributes() {
    return { color: paletteAttr("yellow") };
  },
  parseHTML() {
    return [{ tag: "mark" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["mark", mergeAttributes({ class: "content-highlight" }, HTMLAttributes), 0];
  },
}).configure({ multicolor: true });
