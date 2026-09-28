import type { BlockNode } from "../article-schema/types";

/**
 * Where in-article ad slots go (ADR-009 §7.5):
 * - `in-article-1` after the 3rd top-level block, only when the body has at
 *   least 8 top-level blocks;
 * - then after every 10 more top-level blocks, at most 2 more.
 * Slots sit only *between* top-level blocks, never right after a heading (a
 * heading must stay with the block below it) and never as the last block;
 * when the chosen position is not allowed, the slot moves down one block at
 * a time.
 *
 * Returns the indexes of the blocks a slot is rendered **after**.
 */
export const AD_MIN_BLOCKS = 8;
export const AD_FIRST_AFTER = 3;
export const AD_EVERY = 10;
export const AD_MAX_EXTRA = 2;

export function planInArticleSlots(blocks: readonly Pick<BlockNode, "type">[]): number[] {
  const total = blocks.length;
  if (total < AD_MIN_BLOCKS) return [];

  const allowedAfter = (index: number) =>
    index < total - 1 && blocks[index]?.type !== "heading";

  const positions: number[] = [];
  let target = AD_FIRST_AFTER - 1; // after the 3rd block → index 2
  while (positions.length < 1 + AD_MAX_EXTRA && target < total - 1) {
    let index = target;
    while (index < total - 1 && !allowedAfter(index)) index += 1;
    if (index >= total - 1) break;
    if (!positions.includes(index)) positions.push(index);
    target = index + AD_EVERY;
  }
  return positions;
}

export function inArticleSlotId(position: number): string {
  return position === 0 ? "in-article-1" : `in-article-${position + 1}`;
}
