"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocItem } from "../utils/toc";

function useActiveHeading(ids: string[]) {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (!ids.length || typeof IntersectionObserver === "undefined") return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: [0, 1] },
    );
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

function TocList({ items, active }: { items: TocItem[]; active: string | null }) {
  return (
    <ol className="space-y-1 text-sm">
      {items.map((item) => (
        <li key={item.id} className={item.level === 3 ? "pl-3" : undefined}>
          <a
            href={`#${item.id}`}
            aria-current={active === item.id ? "location" : undefined}
            className={cn(
              "block border-l-2 py-1 pl-3 leading-snug transition-colors",
              active === item.id
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

/**
 * "On this page" (ADR-009 §7.2). Desktop: sticky list with the current
 * section highlighted (IntersectionObserver). Mobile: a collapsed block.
 */
export function TableOfContents({ items, title, variant }: { items: TocItem[]; title: string; variant: "sidebar" | "mobile" }) {
  const active = useActiveHeading(items.map((item) => item.id));
  if (!items.length) return null;
  if (variant === "mobile") {
    return (
      <details className="group rounded-xl border bg-card px-4 py-3 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
          {title}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <nav aria-label={title} className="mt-3">
          <TocList items={items} active={active} />
        </nav>
      </details>
    );
  }
  return (
    <nav aria-label={title} className="hidden lg:block">
      <p className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</p>
      <TocList items={items} active={active} />
    </nav>
  );
}
