/** Reading time: `ceil(word_count / 200)` minutes, at least 1 (ADR-009 §4.4). */
export function readingMinutes(wordCount: number): number {
  if (!Number.isFinite(wordCount) || wordCount <= 0) return 1;
  return Math.max(1, Math.ceil(wordCount / 200));
}
