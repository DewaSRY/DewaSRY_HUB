import type { InteractionSummary, UserMini, VoteValue } from "./type";

/**
 * Mention tokens are `<@userId>` in the stored body (ADR-010 I3). The
 * comment box shows them as `@Name` and turns them back into tokens on
 * submit; the list renders them as bold names. Nothing here produces HTML.
 */
const TOKEN = /<@([^<>\s]{1,64})>/g;

export type CommentSegment = { type: "text"; text: string } | { type: "mention"; id: string; name: string };

/** Splits a stored body into text and mention segments. Unknown ids stay as their raw text. */
export function splitCommentBody(body: string, mentions: Record<string, UserMini>): CommentSegment[] {
  const segments: CommentSegment[] = [];
  let last = 0;
  for (const match of body.matchAll(TOKEN)) {
    const user = mentions[match[1]];
    if (!user) continue;
    if (match.index > last) segments.push({ type: "text", text: body.slice(last, match.index) });
    segments.push({ type: "mention", id: user.id, name: user.name });
    last = match.index + match[0].length;
  }
  if (last < body.length) segments.push({ type: "text", text: body.slice(last) });
  return segments;
}

/** `@Name` label → user id, for the users picked in the comment box. */
export type PickedMentions = Record<string, string>;

export const mentionLabel = (name: string) => `@${name}`;

/** A stored body as editable text (`@Name`), plus the mentions it already had. */
export function toEditableText(body: string, mentions: Record<string, UserMini>): { text: string; picked: PickedMentions } {
  const picked: PickedMentions = {};
  const text = splitCommentBody(body, mentions)
    .map((segment) => {
      if (segment.type === "text") return segment.text;
      picked[mentionLabel(segment.name)] = segment.id;
      return mentionLabel(segment.name);
    })
    .join("");
  return { text, picked };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Editable text → stored body: each picked `@Name` still present becomes
 * `<@id>`. Longest labels first, and only at a word boundary, so `@Budi`
 * never eats the start of `@Budiman`. An `@Name` the user edited stays text.
 */
export function toCommentBody(text: string, picked: PickedMentions): string {
  const labels = Object.keys(picked).sort((a, b) => b.length - a.length);
  if (!labels.length) return text.trim();
  const pattern = new RegExp(`(${labels.map(escapeRegExp).join("|")})(?![\\p{L}\\p{N}_])`, "gu");
  return text.replace(pattern, (label) => `<@${picked[label]}>`).trim();
}

/** Distinct user ids mentioned by the text (for the 5-mention limit). */
export function mentionedIds(text: string, picked: PickedMentions): string[] {
  const ids = new Set<string>();
  for (const match of toCommentBody(text, picked).matchAll(TOKEN)) ids.add(match[1]);
  return [...ids];
}

/** The `@query` being typed right before the caret, or `null`. Needs 2+ characters. */
export function activeMentionQuery(text: string, caret: number): { query: string; start: number } | null {
  const before = text.slice(0, caret);
  const match = /(^|\s)@([\p{L}\p{N}._-]{2,40})$/u.exec(before);
  if (!match) return null;
  return { query: match[2], start: before.length - match[2].length - 1 };
}

/** Replaces the `@query` at `start..caret` with `@Name ` and returns the new caret. */
export function insertMention(text: string, start: number, caret: number, name: string): { text: string; caret: number } {
  const label = `${mentionLabel(name)} `;
  return { text: text.slice(0, start) + label + text.slice(caret), caret: start + label.length };
}

/** Clicking the active vote clears it; clicking the other one switches (ADR-010 I1). */
export function nextVote(current: VoteValue | null, clicked: VoteValue): VoteValue | null {
  return current === clicked ? null : clicked;
}

/** Counts after moving the caller's vote from `from` to `to` (optimistic update). */
export function applyVote(summary: InteractionSummary, from: VoteValue | null, to: VoteValue | null): InteractionSummary {
  const delta = (value: VoteValue) => (to === value ? 1 : 0) - (from === value ? 1 : 0);
  return {
    ...summary,
    upCount: Math.max(0, summary.upCount + delta(1)),
    downCount: Math.max(0, summary.downCount + delta(-1)),
  };
}

/** Number of code points, which is what the API counts (not UTF-16 units). */
export function codePointLength(value: string): number {
  return [...value].length;
}
