import { cn } from "@/lib/utils";

/** "DS" monogram + wordmark. Pure markup, usable in server and client components. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative flex size-8 items-center justify-center overflow-hidden rounded-lg bg-primary font-mono text-[13px] font-bold tracking-tighter text-primary-foreground shadow-sm",
        className,
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgb(255_255_255/0.35),transparent_60%)]" />
      <span className="relative">DS</span>
    </span>
  );
}

export function BrandWordmark({ name, tagline, className }: { name: string; tagline?: string; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">{name}</span>
        {tagline ? <span className="mt-0.5 text-[11px] text-muted-foreground">{tagline}</span> : null}
      </span>
    </span>
  );
}
