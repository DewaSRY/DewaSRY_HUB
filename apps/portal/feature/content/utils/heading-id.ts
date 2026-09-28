/**
 * Heading ids (ADR-009 §7.2): made from the text, slugified, with `-2`, `-3`
 * for duplicates. One `HeadingIdAllocator` per rendered document, so the TOC
 * and the rendered headings agree.
 */
export function slugifyHeading(text: string): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "section";
}

export class HeadingIdAllocator {
  private readonly counts = new Map<string, number>();

  next(text: string): string {
    const base = slugifyHeading(text);
    const seen = this.counts.get(base) ?? 0;
    this.counts.set(base, seen + 1);
    if (seen === 0) return base;
    // Avoid colliding with a heading whose own text slugs to `base-2`.
    let candidate = `${base}-${seen + 1}`;
    let bump = seen + 1;
    while (this.counts.has(candidate)) {
      bump += 1;
      candidate = `${base}-${bump}`;
    }
    this.counts.set(candidate, 1);
    return candidate;
  }
}
