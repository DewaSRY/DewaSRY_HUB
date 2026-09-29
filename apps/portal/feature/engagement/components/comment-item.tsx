"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { initials } from "@/feature/auth";
import type { Comment, UserMini } from "../type";
import { CommentBody } from "./comment-body";

export function UserAvatar({ user }: { user: Pick<UserMini, "name" | "avatarUrl"> }) {
  return (
    <Avatar>
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" referrerPolicy="no-referrer" /> : null}
      <AvatarFallback>{initials(user.name)}</AvatarFallback>
    </Avatar>
  );
}

export function CommentItem({ comment, badge, actions }: { comment: Comment; badge?: ReactNode; actions?: ReactNode }) {
  const { t } = useTranslation("engagement");
  const { locale } = useParams<{ locale: string }>();
  return (
    <article className="flex gap-3">
      <UserAvatar user={comment.author} />
      <div className="min-w-0 flex-1 space-y-1">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-medium">{comment.author.name}</span>
          {badge}
          <time dateTime={comment.createdAt} title={formatDateTime(comment.createdAt, { locale })} className="text-xs text-muted-foreground">
            {formatDate(comment.createdAt, { locale })}
          </time>
          {comment.editedAt ? (
            <span className="text-xs text-muted-foreground" title={formatDateTime(comment.editedAt, { locale })}>
              · {t("comments.edited")}
            </span>
          ) : null}
        </header>
        <CommentBody body={comment.body} mentions={comment.mentions} />
        {actions}
      </div>
    </article>
  );
}
