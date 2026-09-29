import { Skeleton } from "@/components/ui/skeleton";

/** Same outline as the loaded section, so mounting it shifts nothing (ADR-010 D6). */
export function InteractionsSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
