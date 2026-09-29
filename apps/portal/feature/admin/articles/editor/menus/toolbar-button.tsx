"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Keeps the editor selection when a toolbar control is pressed: the
 * `mousedown` default would move focus out of the editor (and close the
 * bubble menu).
 */
export const keepSelection = (event: { preventDefault: () => void }) => event.preventDefault();

/** Formats `Mod-Shift-S` for the tooltip (`⌘⇧S` on macOS, `Ctrl+Shift+S` elsewhere). */
export function formatShortcut(shortcut: string, mac: boolean): string {
  const parts = shortcut.split("-");
  if (mac) {
    return parts
      .map((part) => ({ Mod: "⌘", Shift: "⇧", Alt: "⌥", Ctrl: "⌃" })[part] ?? part.toUpperCase())
      .join("");
  }
  return parts.map((part) => (part === "Mod" ? "Ctrl" : part.length === 1 ? part.toUpperCase() : part)).join("+");
}

const subscribeNever = () => () => undefined;

/** Platform is only known in the browser; the server snapshot says "not a Mac". */
function useIsMac() {
  return useSyncExternalStore(
    subscribeNever,
    () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent),
    () => false,
  );
}

const buttonClass =
  "inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-sm text-foreground/80 transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 aria-pressed:bg-primary/10 aria-pressed:text-primary aria-expanded:bg-muted [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

/** Icon button with an `aria-label` and a tooltip that shows its shortcut (ADR-009 §5.3). */
export function ToolbarButton({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  className,
  children,
  ...rest
}: {
  label: string;
  shortcut?: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children: ReactNode;
  "aria-haspopup"?: boolean;
  "aria-expanded"?: boolean;
}) {
  const mac = useIsMac();
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={label}
            aria-pressed={active === undefined ? undefined : active}
            disabled={disabled}
            onMouseDown={keepSelection}
            onClick={onClick}
            className={cn(buttonClass, className)}
            {...rest}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut ? <kbd className="ml-1.5 font-sans opacity-70">{formatShortcut(shortcut, mac)}</kbd> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function ToolbarSeparator() {
  return <span role="separator" aria-orientation="vertical" className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

/**
 * A button with a small panel. Unlike the shadcn dropdown it never takes
 * focus out of the editor (every control keeps the selection on
 * `mousedown`), so it also works inside the bubble menu. The panel is
 * portalled with fixed positioning, so a scrolling toolbar does not clip it.
 * Closes on outside click, scroll, resize, and `Escape`.
 */
export function ToolbarPopover({
  label,
  trigger,
  active,
  disabled,
  children,
  align = "start",
  className,
  buttonClassName,
  chevron = true,
  onOpenChange,
}: {
  label: string;
  trigger: ReactNode;
  active?: boolean;
  disabled?: boolean;
  children: (close: () => void) => ReactNode;
  align?: "start" | "end";
  className?: string;
  buttonClassName?: string;
  chevron?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const show = (rect: DOMRect | null) => {
    setAnchor(rect);
    if (rect) onOpenChange?.(true);
  };
  const hide = () => {
    setAnchor(null);
    onOpenChange?.(false);
  };
  // The listeners below close with the latest callback.
  const onOpenChangeRef = useRef(onOpenChange);
  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const open = anchor !== null;

  useEffect(() => {
    if (!open) return;
    const close = () => {
      setAnchor(null);
      onOpenChangeRef.current?.(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const onScroll = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup
        aria-expanded={open}
        disabled={disabled}
        onMouseDown={keepSelection}
        onClick={() => (anchor ? hide() : show(buttonRef.current?.getBoundingClientRect() ?? null))}
        className={cn(buttonClass, active && "text-primary", buttonClassName)}
      >
        {trigger}
        {chevron ? <ChevronDown className="size-3 opacity-60" aria-hidden /> : null}
      </button>
      {anchor
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              aria-label={label}
              onMouseDown={keepSelection}
              style={{
                position: "fixed",
                top: anchor.bottom + 4,
                ...(align === "end" ? { right: Math.max(8, window.innerWidth - anchor.right) } : { left: Math.max(8, anchor.left) }),
              }}
              className={cn(
                "z-70 max-h-[60vh] min-w-40 overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md",
                className,
              )}
            >
              {children(hide)}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** One row of a `ToolbarPopover` panel. */
export function PopoverItem({
  onSelect,
  active,
  children,
  label,
}: {
  onSelect: () => void;
  active?: boolean;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={Boolean(active)}
      aria-label={label}
      onMouseDown={keepSelection}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent [&_svg]:size-4 [&_svg]:shrink-0",
        active && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}
