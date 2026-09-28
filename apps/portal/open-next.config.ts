// OpenNext adapter config for Cloudflare Workers (ADR-001 §5.2).
// - R2 holds the ISR / Data Cache entries.
// - D1 holds tags, so `revalidatePath()` from app/api/revalidate works across isolates.
// - A Durable Object queue de-duplicates background (time-based) revalidations.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
  tagCache: d1NextTagCache,
  queue: doQueue,
});
