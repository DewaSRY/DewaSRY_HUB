import type { EmbedProvider } from "./types";

/**
 * Embed provider allowlist (ADR-009 §5.5). The body stores only
 * `provider` + `id`; the frame URL is built here at render time, so a changed
 * or hostile URL can never get into content.
 *
 * Adding a provider = update this table, the API pattern, the renderer, and
 * the CSP `frame-src`.
 */
export interface EmbedProviderSpec {
  provider: EmbedProvider;
  label: string;
  idPattern: RegExp;
  /** Parses a pasted URL into an `id`, or `null` when it is not this provider. */
  parse: (url: URL) => string | null;
  frameSrc: (id: string) => string;
  /** `sandbox` attribute for the iframe. */
  sandbox: string;
  allow: string;
  /** Optional thumbnail for the click-to-load facade. */
  thumbnail?: (id: string) => string;
}

const hostIs = (url: URL, ...hosts: string[]) =>
  hosts.includes(url.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, ""));

export const EMBED_PROVIDERS: Record<EmbedProvider, EmbedProviderSpec> = {
  youtube: {
    provider: "youtube",
    label: "YouTube",
    idPattern: /^[A-Za-z0-9_-]{11}$/,
    parse(url) {
      if (hostIs(url, "youtu.be")) return url.pathname.split("/")[1] ?? null;
      if (!hostIs(url, "youtube.com", "youtube-nocookie.com")) return null;
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?#]+)/);
      return match?.[1] ?? null;
    },
    frameSrc: (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`,
    sandbox: "allow-scripts allow-same-origin allow-presentation allow-popups",
    allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen",
    thumbnail: (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  },
  vimeo: {
    provider: "vimeo",
    label: "Vimeo",
    idPattern: /^\d{1,12}$/,
    parse(url) {
      if (hostIs(url, "player.vimeo.com")) {
        return url.pathname.match(/^\/video\/(\d+)/)?.[1] ?? null;
      }
      if (!hostIs(url, "vimeo.com")) return null;
      return url.pathname.match(/^\/(?:channels\/[^/]+\/)?(\d+)/)?.[1] ?? null;
    },
    frameSrc: (id) => `https://player.vimeo.com/video/${id}?dnt=1&autoplay=1`,
    sandbox: "allow-scripts allow-same-origin allow-presentation allow-popups",
    allow: "autoplay; fullscreen; picture-in-picture",
  },
  codesandbox: {
    provider: "codesandbox",
    label: "CodeSandbox",
    idPattern: /^[a-z0-9-]{1,64}$/,
    parse(url) {
      if (!hostIs(url, "codesandbox.io")) return null;
      const match = url.pathname.match(/^\/(?:s|embed|p\/sandbox|p\/devbox)\/([^/?#]+)/);
      return match?.[1] ?? null;
    },
    frameSrc: (id) => `https://codesandbox.io/embed/${id}`,
    sandbox: "allow-scripts allow-same-origin allow-forms allow-modals allow-popups",
    allow: "clipboard-write",
  },
  figma: {
    provider: "figma",
    label: "Figma",
    idPattern: /^[A-Za-z0-9]{10,64}$/,
    parse(url) {
      if (!hostIs(url, "figma.com")) return null;
      return url.pathname.match(/^\/(?:file|design|proto|board)\/([A-Za-z0-9]+)/)?.[1] ?? null;
    },
    frameSrc: (id) =>
      `https://www.figma.com/embed?embed_host=dewasuryahub&url=${encodeURIComponent(
        `https://www.figma.com/design/${id}`,
      )}`,
    sandbox: "allow-scripts allow-same-origin allow-popups",
    allow: "fullscreen",
  },
};

export const EMBED_PROVIDER_KEYS = Object.keys(EMBED_PROVIDERS) as EmbedProvider[];

export function isEmbedProvider(value: unknown): value is EmbedProvider {
  return typeof value === "string" && value in EMBED_PROVIDERS;
}

/** True when `id` matches the provider's pattern (the API applies the same check). */
export function isValidEmbedId(provider: EmbedProvider, id: unknown): id is string {
  return typeof id === "string" && EMBED_PROVIDERS[provider].idPattern.test(id);
}

/**
 * Parses a pasted URL into `{ provider, id }`, or `null` when the URL is not
 * on the allowlist (it then stays an inline link or a link card).
 */
export function parseEmbedUrl(input: string): { provider: EmbedProvider; id: string } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  for (const spec of Object.values(EMBED_PROVIDERS)) {
    const id = spec.parse(url);
    if (id && spec.idPattern.test(id)) return { provider: spec.provider, id };
  }
  return null;
}

/** The frame URL for a stored embed, or `null` when the pair is invalid. */
export function embedFrameSrc(provider: unknown, id: unknown): string | null {
  if (!isEmbedProvider(provider) || !isValidEmbedId(provider, id)) return null;
  return EMBED_PROVIDERS[provider].frameSrc(id);
}
