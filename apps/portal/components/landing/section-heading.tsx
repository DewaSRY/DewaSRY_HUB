import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl space-y-2">
        {eyebrow ? <p className="text-sm font-semibold tracking-wide text-primary">{eyebrow}</p> : null}
        <Tag className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</Tag>
        {description ? <p className="text-base leading-relaxed text-muted-foreground text-pretty">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
