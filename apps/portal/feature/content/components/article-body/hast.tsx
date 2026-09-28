import { Fragment, createElement, type ReactNode } from "react";

/**
 * Converts the tiny hast tree lowlight returns (elements with `className`
 * and text) into React elements — no `dangerouslySetInnerHTML` (ADR-009 §7.1).
 * Only `span` elements and their `className` are produced; anything else is
 * rendered as its text.
 */
type HastText = { type: "text"; value: string };
type HastElement = {
  type: "element";
  tagName: string;
  properties?: { className?: unknown };
  children?: HastNode[];
};
type HastNode = HastText | HastElement | { type: string; children?: HastNode[] };

export function hastToReact(nodes: HastNode[] | undefined, keyPrefix = "h"): ReactNode[] {
  return (nodes ?? []).map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "text") return (node as HastText).value;
    const children = hastToReact((node as HastElement).children, key);
    if (node.type === "element" && (node as HastElement).tagName === "span") {
      const raw = (node as HastElement).properties?.className;
      const className = Array.isArray(raw)
        ? raw.filter((c): c is string => typeof c === "string" && /^hljs-[\w-]+$|^[\w-]+_$/.test(c)).join(" ")
        : undefined;
      return createElement("span", { key, className: className || undefined }, ...children);
    }
    return createElement(Fragment, { key }, ...children);
  });
}
