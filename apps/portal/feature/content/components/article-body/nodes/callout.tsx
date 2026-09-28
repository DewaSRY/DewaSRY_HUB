import type { ReactNode } from "react";
import { CircleAlert, Info, Lightbulb, TriangleAlert, type LucideIcon } from "lucide-react";
import type { CalloutTone } from "../../../article-schema/types";

const ICONS: Record<CalloutTone, LucideIcon> = {
  info: Info,
  tip: Lightbulb,
  warning: TriangleAlert,
  danger: CircleAlert,
};

/** `<aside role="note">` with an icon and colour per tone. */
export function Callout({ tone, label, children }: { tone: CalloutTone; label: string; children: ReactNode }) {
  const Icon = ICONS[tone] ?? Info;
  return (
    <aside role="note" aria-label={label} data-tone={tone} className="article-callout">
      <Icon className="article-callout-icon" aria-hidden />
      <div className="min-w-0 flex-1 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{children}</div>
    </aside>
  );
}
