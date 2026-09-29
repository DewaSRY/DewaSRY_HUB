"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { startSession, useSession } from "@/feature/auth";
import { useInteractionSummary, useMyInteraction, useVoteMutation } from "../hooks";
import { myInteractionQuery } from "../queries";
import type { PendingAction, VoteValue } from "../type";
import { nextVote } from "../utils";
import { CommentBox, type CommentBoxHandle, type Viewer } from "./comment-box";
import { CommentList } from "./comment-list";
import { InteractionsSkeleton } from "./interactions-skeleton";
import { SignInPromptDialog } from "./sign-in-prompt-dialog";
import { VoteButtons } from "./vote-buttons";

/**
 * The interaction island (ADR-010 §8). Loaded with `next/dynamic` by
 * `ArticleInteractionsLazy`, so Firebase starts here and never on the ISR
 * page itself. Public reads work for everyone; any action by a Visitor opens
 * the sign-in dialog and is replayed once they are signed in.
 */
export default function ArticleInteractions({ articleId, slug }: { articleId: string; slug: string }) {
  const { t } = useTranslation("engagement");
  const queryClient = useQueryClient();
  const { status, me, firebaseUser } = useSession();
  const signedIn = status === "signed-in";

  useEffect(() => {
    startSession();
  }, []);

  const summary = useInteractionSummary(slug);
  const mine = useMyInteraction(articleId, signedIn);
  const { mutate: mutateVote, isPending: voting } = useVoteMutation(slug, articleId);

  const boxRef = useRef<CommentBoxHandle>(null);
  const pendingRef = useRef<PendingAction | null>(null);
  const [prompt, setPrompt] = useState<PendingAction | null>(null);

  function askToSignIn(action: PendingAction) {
    pendingRef.current = action;
    setPrompt(action);
  }

  function handleVote(value: VoteValue) {
    if (status === "signed-out") return askToSignIn({ type: "vote", value });
    if (!signedIn || !mine.isSuccess) return;
    const current = mine.data.vote;
    mutateVote({ from: current, to: nextVote(current, value) });
  }

  // Replay what the Visitor clicked, once the session and their interaction are loaded (§8.3).
  // A replayed vote *sets* the value: clicking "up" must never clear an existing up vote.
  useEffect(() => {
    const action = pendingRef.current;
    if (!action || !signedIn || !mine.isSuccess) return;
    pendingRef.current = null;
    if (action.type === "vote") {
      if (mine.data.vote !== action.value) mutateVote({ from: mine.data.vote, to: action.value });
    } else {
      boxRef.current?.focus();
    }
  }, [signedIn, mine.isSuccess, mine.data, mutateVote]);

  const viewer: Viewer = status === "loading" ? "loading" : signedIn ? "user" : "visitor";
  const profile = me
    ? { name: me.name ?? me.email, avatarUrl: me.avatarUrl }
    : firebaseUser
      ? { name: firebaseUser.displayName ?? firebaseUser.email ?? "?", avatarUrl: firebaseUser.photoURL }
      : null;

  if (summary.isPending) return <InteractionsSkeleton />;
  if (summary.isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
        <span>{t("section.loadFailed")}</span>
        <Button variant="outline" size="sm" onClick={() => summary.refetch()} loading={summary.isRefetching}>
          {t("section.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <VoteButtons
          upCount={summary.data.upCount}
          downCount={summary.data.downCount}
          myVote={mine.data?.vote ?? null}
          disabled={status === "loading" || (signedIn && (!mine.isSuccess || voting))}
          onVote={handleVote}
        />
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t("comments.count", { count: summary.data.commentCount })}
        </p>
      </div>

      <CommentBox
        ref={boxRef}
        articleId={articleId}
        slug={slug}
        viewer={viewer}
        profile={profile}
        mine={mine.data?.comment ?? null}
        mineLoading={signedIn && mine.isPending}
        onRequireSignIn={() => askToSignIn({ type: "comment" })}
        onConflict={async () => {
          const fresh = await queryClient.fetchQuery({ ...myInteractionQuery(articleId), staleTime: 0 }).catch(() => null);
          return fresh?.comment ?? null;
        }}
      />

      <CommentList slug={slug} excludeId={mine.data?.comment?.id} />

      <SignInPromptDialog
        action={prompt}
        onCancel={() => {
          pendingRef.current = null;
          setPrompt(null);
        }}
        onSignedIn={() => setPrompt(null)}
      />
    </div>
  );
}
