"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { AD_CLIENT, AD_MIN_HEIGHT, AD_PLACEHOLDERS, adUnitId, slotKind } from "./config";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One ad slot with a fixed reserved `min-height` (no CLS). Only `(site)`
 * pages render it (ADR-001 §5.2). Without an ad client it renders nothing,
 * or a grey placeholder when placeholders are enabled.
 */
export function AdSlot({ slot, label = "Advertisement", className }: { slot: string; label?: string; className?: string }) {
  const kind = slotKind(slot);
  const unit = adUnitId(slot);
  const pushed = useRef(false);
  const minHeight = AD_MIN_HEIGHT[kind];

  useEffect(() => {
    if (!AD_CLIENT || !unit || pushed.current) return;
    pushed.current = true;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // The network script may be blocked; the reserved box stays empty.
    }
  }, [unit]);

  if (!AD_CLIENT) {
    if (!AD_PLACEHOLDERS) return null;
    return <AdPlaceholder slot={slot} label={label} className={className} />;
  }

  return (
    <aside
      aria-label={label}
      data-ad-slot={slot}
      className={cn("ad-slot not-prose my-8", kind === "sidebar" && "my-0 hidden lg:block", className)}
      style={{ minHeight }}
    >
      <span className="mb-1 block text-center text-[10px] tracking-widest text-muted-foreground uppercase">{label}</span>
      {unit ? (
        <ins
          className="adsbygoogle"
          style={{ display: "block", minHeight: minHeight - 16 }}
          data-ad-client={AD_CLIENT}
          data-ad-slot={unit}
          data-ad-format={kind === "sidebar" ? "vertical" : "auto"}
          data-full-width-responsive="true"
        />
      ) : null}
    </aside>
  );
}

/** Grey box in the same place and size as an ad (dev, and the admin preview). */
export function AdPlaceholder({ slot, label = "Advertisement", className }: { slot: string; label?: string; className?: string }) {
  const kind = slotKind(slot);
  return (
    <div
      aria-hidden
      data-ad-slot={slot}
      className={cn(
        "ad-slot not-prose my-8 flex items-center justify-center rounded-lg border border-dashed bg-muted/60 text-xs tracking-widest text-muted-foreground uppercase",
        kind === "sidebar" && "my-0 hidden lg:flex",
        className,
      )}
      style={{ minHeight: AD_MIN_HEIGHT[kind] }}
    >
      {label} · {slot}
    </div>
  );
}
