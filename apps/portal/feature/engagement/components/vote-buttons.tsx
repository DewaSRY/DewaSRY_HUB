"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { VoteValue } from "../type";

function VoteButton({
  active,
  count,
  label,
  countLabel,
  icon: Icon,
  disabled,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  countLabel: string;
  icon: typeof ThumbsUp;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={`${label} · ${countLabel}`}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium tabular-nums transition-colors",
        "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      <Icon className={cn("size-4", active && "fill-current")} aria-hidden />
      <span>{count}</span>
    </button>
  );
}

/** Up / down, one active at most (ADR-010 I1). Visitors are sent to the sign-in dialog by `onVote`. */
export function VoteButtons({
  upCount,
  downCount,
  myVote,
  disabled,
  onVote,
}: {
  upCount: number;
  downCount: number;
  myVote: VoteValue | null;
  disabled?: boolean;
  onVote: (value: VoteValue) => void;
}) {
  const { t } = useTranslation("engagement");
  return (
    <div role="group" aria-label={t("vote.label")} className="flex items-center gap-2">
      <VoteButton
        active={myVote === 1}
        count={upCount}
        label={t("vote.up")}
        countLabel={t("vote.upCount", { count: upCount })}
        icon={ThumbsUp}
        disabled={disabled}
        onClick={() => onVote(1)}
      />
      <VoteButton
        active={myVote === -1}
        count={downCount}
        label={t("vote.down")}
        countLabel={t("vote.downCount", { count: downCount })}
        icon={ThumbsDown}
        disabled={disabled}
        onClick={() => onVote(-1)}
      />
    </div>
  );
}
