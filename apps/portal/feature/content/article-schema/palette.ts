import type { PaletteKey } from "./types";

/**
 * Text colour and highlight store a palette key, never a hex value, so every
 * colour has a light and a dark version (ADR-009 §4.5). The CSS tokens
 * (`--content-<key>`, `--content-<key>-bg`) live in `app/globals.css`.
 */
export const PALETTE_KEYS = [
  "gray",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
] as const satisfies readonly PaletteKey[];

export function isPaletteKey(value: unknown): value is PaletteKey {
  return typeof value === "string" && (PALETTE_KEYS as readonly string[]).includes(value);
}

/** CSS variable for a palette key — used by the editor's colour swatches. */
export function paletteVar(key: PaletteKey, kind: "text" | "bg"): string {
  return kind === "text" ? `var(--content-${key})` : `var(--content-${key}-bg)`;
}
