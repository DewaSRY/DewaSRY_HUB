"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Extension, type Editor, type Range } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterCommands } from "../utils";

export interface SlashItem {
  id: string;
  label: string;
  keywords: readonly string[];
  icon: LucideIcon;
  hint?: string;
  run: (editor: Editor, range: Range) => void;
}

interface SlashMenuHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

interface SlashMenuListProps {
  items: SlashItem[];
  command: (item: SlashItem) => void;
  emptyLabel: string;
  label: string;
}

const SlashMenuList = forwardRef<SlashMenuHandle, SlashMenuListProps>(function SlashMenuList(
  { items, command, emptyLabel, label },
  ref,
) {
  const [selected, setSelected] = useState(0);
  const [prevItems, setPrevItems] = useState(items);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset the highlight whenever the query changes the list.
  if (prevItems !== items) {
    setPrevItems(items);
    setSelected(0);
  }

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${selected}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      if (event.key === "ArrowDown") {
        setSelected((value) => (value + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((value) => (value - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label={label}
      className="max-h-80 w-64 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
    >
      {items.length === 0 ? (
        <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === selected}
              data-index={index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setSelected(index)}
              onClick={() => command(item)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm outline-none",
                index === selected && "bg-accent text-accent-foreground",
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-background">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="flex-1 truncate">{item.label}</span>
              {item.hint ? <kbd className="font-mono text-xs text-muted-foreground">{item.hint}</kbd> : null}
            </button>
          );
        })
      )}
    </div>
  );
});

export interface SlashCommandOptions {
  /** Read on every keystroke, so labels follow the current language. */
  getItems: () => SlashItem[];
  getLabels: () => { empty: string; label: string };
}

export const slashPluginKey = new PluginKey("slashCommand");

/**
 * `/` slash menu (ADR-009 §5.3), built on `@tiptap/suggestion` with our own
 * popup. Not offered inside code blocks.
 */
export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return { getItems: () => [], getLabels: () => ({ empty: "", label: "" }) };
  },

  addProseMirrorPlugins() {
    const { getItems, getLabels } = this.options;
    return [
      Suggestion<SlashItem, SlashItem>({
        editor: this.editor,
        pluginKey: slashPluginKey,
        char: "/",
        allowSpaces: false,
        startOfLine: false,
        allow: ({ editor }) => !editor.isActive("codeBlock"),
        items: ({ query }) => filterCommands(getItems(), query).slice(0, 20),
        command: ({ editor, range, props }) => props.run(editor, range),
        render: () => {
          let renderer: ReactRenderer<SlashMenuHandle, SlashMenuListProps> | null = null;
          let unmount: (() => void) | null = null;
          const toProps = (props: SuggestionProps<SlashItem, SlashItem>): SlashMenuListProps => ({
            items: props.items,
            command: props.command,
            emptyLabel: getLabels().empty,
            label: getLabels().label,
          });
          return {
            onStart: (props) => {
              renderer = new ReactRenderer(SlashMenuList, { editor: props.editor, props: toProps(props) });
              renderer.element.style.zIndex = "60";
              unmount = props.mount(renderer.element);
            },
            onUpdate: (props) => renderer?.updateProps(toProps(props)),
            onKeyDown: (props) => {
              if (props.event.key === "Escape") return false;
              return renderer?.ref?.onKeyDown(props) ?? false;
            },
            onExit: () => {
              unmount?.();
              renderer?.destroy();
              renderer = null;
              unmount = null;
            },
          };
        },
      }),
    ];
  },
});
