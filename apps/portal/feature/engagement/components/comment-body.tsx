import type { UserMini } from "../type";
import { splitCommentBody } from "../utils";

/** Text and `@Name` segments as React text nodes — never HTML (ADR-010 §9). */
export function CommentBody({ body, mentions }: { body: string; mentions: Record<string, UserMini> }) {
  return (
    <p className="text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground">
      {splitCommentBody(body, mentions).map((segment, i) =>
        segment.type === "text" ? (
          <span key={i}>{segment.text}</span>
        ) : (
          <strong key={i} className="font-semibold text-primary">
            @{segment.name}
          </strong>
        ),
      )}
    </p>
  );
}
