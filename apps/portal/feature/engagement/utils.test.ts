import { describe, expect, it } from "vitest";
import {
  activeMentionQuery,
  applyVote,
  codePointLength,
  insertMention,
  mentionedIds,
  nextVote,
  splitCommentBody,
  toCommentBody,
  toEditableText,
} from "./utils";

const budi = { id: "11111111-1111-1111-1111-111111111111", name: "Budi", avatarUrl: null };
const budiman = { id: "22222222-2222-2222-2222-222222222222", name: "Budiman", avatarUrl: null };

describe("splitCommentBody", () => {
  it("splits text and known mentions, keeping unknown tokens as text", () => {
    const body = `Hi <@${budi.id}>, see <@unknown>!`;
    expect(splitCommentBody(body, { [budi.id]: budi })).toEqual([
      { type: "text", text: "Hi " },
      { type: "mention", id: budi.id, name: "Budi" },
      { type: "text", text: ", see <@unknown>!" },
    ]);
  });

  it("keeps markup as plain text", () => {
    expect(splitCommentBody("<script>x</script>", {})).toEqual([{ type: "text", text: "<script>x</script>" }]);
  });
});

describe("editable text round trip", () => {
  it("turns tokens into @Name and back", () => {
    const body = `Thanks <@${budi.id}> and <@${budiman.id}>`;
    const { text, picked } = toEditableText(body, { [budi.id]: budi, [budiman.id]: budiman });
    expect(text).toBe("Thanks @Budi and @Budiman");
    expect(toCommentBody(text, picked)).toBe(body);
  });

  it("never matches a shorter name inside a longer word", () => {
    const picked = { "@Budi": budi.id };
    expect(toCommentBody("@Budiman is not @Budi.", picked)).toBe(`@Budiman is not <@${budi.id}>.`);
  });

  it("leaves an edited label as text and trims", () => {
    expect(toCommentBody("  @Bud hello  ", { "@Budi": budi.id })).toBe("@Bud hello");
  });

  it("counts distinct mentioned users", () => {
    expect(mentionedIds("@Budi @Budi @Budiman", { "@Budi": budi.id, "@Budiman": budiman.id })).toEqual([budi.id, budiman.id]);
  });
});

describe("mention typing", () => {
  it("finds the @query before the caret", () => {
    expect(activeMentionQuery("hello @bu", 9)).toEqual({ query: "bu", start: 6 });
    expect(activeMentionQuery("@bu", 3)).toEqual({ query: "bu", start: 0 });
    expect(activeMentionQuery("hello @b", 8)).toBeNull();
    expect(activeMentionQuery("mail@budi", 9)).toBeNull();
    expect(activeMentionQuery("@budi done", 10)).toBeNull();
  });

  it("inserts the picked name and moves the caret", () => {
    expect(insertMention("hi @bu there", 3, 6, "Budi")).toEqual({ text: "hi @Budi  there", caret: 9 });
  });
});

describe("votes", () => {
  const summary = { articleId: "a", upCount: 3, downCount: 1, commentCount: 0 };

  it("clears the active vote and switches the other", () => {
    expect(nextVote(1, 1)).toBeNull();
    expect(nextVote(1, -1)).toBe(-1);
    expect(nextVote(null, 1)).toBe(1);
  });

  it("moves counts optimistically", () => {
    expect(applyVote(summary, null, 1)).toMatchObject({ upCount: 4, downCount: 1 });
    expect(applyVote(summary, 1, -1)).toMatchObject({ upCount: 2, downCount: 2 });
    expect(applyVote(summary, -1, null)).toMatchObject({ upCount: 3, downCount: 0 });
    expect(applyVote({ ...summary, downCount: 0 }, -1, null).downCount).toBe(0);
  });
});

it("counts code points like the API", () => {
  expect(codePointLength("😀a")).toBe(2);
});
