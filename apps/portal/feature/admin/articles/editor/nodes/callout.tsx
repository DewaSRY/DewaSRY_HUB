"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import { useTranslation } from "react-i18next";
import { CircleAlert, Info, Lightbulb, TriangleAlert, type LucideIcon } from "lucide-react";
import type { CalloutTone } from "@/feature/content";
import { PopoverItem, ToolbarPopover } from "../menus/toolbar-button";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      /** Wraps the selected blocks in a callout. */
      setCallout: (attrs?: { tone?: CalloutTone }) => ReturnType;
      toggleCallout: (attrs?: { tone?: CalloutTone }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const CALLOUT_TONES: readonly CalloutTone[] = ["info", "tip", "warning", "danger"];

export const CALLOUT_ICONS: Record<CalloutTone, LucideIcon> = {
  info: Info,
  tip: Lightbulb,
  warning: TriangleAlert,
  danger: CircleAlert,
};

function isTone(value: unknown): value is CalloutTone {
  return typeof value === "string" && (CALLOUT_TONES as readonly string[]).includes(value);
}

function CalloutView({ node, editor, updateAttributes }: ReactNodeViewProps) {
  const { t } = useTranslation("admin");
  const tone: CalloutTone = isTone(node.attrs.tone) ? node.attrs.tone : "info";
  const Icon = CALLOUT_ICONS[tone];

  return (
    <NodeViewWrapper as="aside" className="article-callout" data-tone={tone}>
      <div contentEditable={false} className="not-prose">
        {editor.isEditable ? (
          <ToolbarPopover
            label={t("editor.callout.tone")}
            trigger={<Icon className="article-callout-icon m-0!" aria-hidden />}
            className="min-w-36"
          >
            {(close) =>
              CALLOUT_TONES.map((value) => {
                const ToneIcon = CALLOUT_ICONS[value];
                return (
                  <PopoverItem
                    key={value}
                    active={value === tone}
                    onSelect={() => {
                      updateAttributes({ tone: value });
                      close();
                    }}
                  >
                    <ToneIcon aria-hidden />
                    {t(`editor.callout.tones.${value}`)}
                  </PopoverItem>
                );
              })
            }
          </ToolbarPopover>
        ) : (
          <Icon className="article-callout-icon" aria-hidden />
        )}
      </div>
      <NodeViewContent className="min-w-0 flex-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0" />
    </NodeViewWrapper>
  );
}

/** `callout` block (ADR-009 §4.2): `tone` = `info` | `tip` | `warning` | `danger`. */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      tone: {
        default: "info",
        parseHTML: (element: HTMLElement) => {
          const value = element.getAttribute("data-tone");
          return isTone(value) ? value : "info";
        },
        renderHTML: (attributes: Record<string, unknown>) => ({ "data-tone": attributes.tone }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["aside", mergeAttributes({ "data-type": "callout", class: "article-callout" }, HTMLAttributes), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tone: attrs?.tone ?? "info" }),
      toggleCallout:
        (attrs) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { tone: attrs?.tone ?? "info" }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
