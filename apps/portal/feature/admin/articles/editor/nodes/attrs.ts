/**
 * A node attribute stored as `data-<attr>` in the editor's HTML (used for
 * copy/paste inside the editor). The body JSON is what gets saved; the HTML
 * form only has to round-trip through the clipboard.
 */
export function dataAttribute<T = string | null>(name: string, fallback: T = null as T) {
  const key = `data-${name.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
  return {
    default: fallback,
    parseHTML: (element: HTMLElement) => element.getAttribute(key) ?? fallback,
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes[name];
      return value === null || value === undefined || value === "" ? {} : { [key]: String(value) };
    },
  };
}
