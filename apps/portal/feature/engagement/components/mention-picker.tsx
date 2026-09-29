"use client";

import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import type { UserMini } from "../type";
import { UserAvatar } from "./comment-item";

export const MENTION_LISTBOX_ID = "comment-mention-listbox";
export const mentionOptionId = (index: number) => `comment-mention-option-${index}`;

/**
 * The `@` suggestions under the comment box (UC-25). Keyboard handling lives
 * in the textarea (ArrowUp/Down, Enter/Tab, Escape); this only renders.
 */
export function MentionPicker({
  users,
  loading,
  activeIndex,
  onPick,
  onHover,
}: {
  users: UserMini[];
  loading: boolean;
  activeIndex: number;
  onPick: (user: UserMini) => void;
  onHover: (index: number) => void;
}) {
  const { t } = useTranslation("engagement");
  return (
    <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
      <ul id={MENTION_LISTBOX_ID} role="listbox" aria-label={t("mention.listLabel")} className="max-h-64 overflow-y-auto p-1">
        {users.map((user, index) => (
          <li
            key={user.id}
            id={mentionOptionId(index)}
            role="option"
            aria-selected={index === activeIndex}
            // mousedown, not click: keeps the textarea focused and the caret in place.
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(user);
            }}
            onMouseEnter={() => onHover(index)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              index === activeIndex ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            <UserAvatar user={user} />
            <span className="truncate">{user.name}</span>
          </li>
        ))}
      </ul>
      {!users.length ? (
        <p className="px-3 py-2 text-sm text-muted-foreground" role="status">
          {loading ? t("mention.searching") : t("mention.noResults")}
        </p>
      ) : null}
    </div>
  );
}
