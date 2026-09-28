import { revalidatePath } from "next/cache";
import { locales } from "@/i18n/settings";
import { logger } from "@/lib/logger";
import { expandRevalidatePaths, isValidSecret, parseRevalidateBody } from "./revalidate";

/**
 * `POST /api/revalidate` — called by the hub API after content changes
 * (ADR-003 §11.1). The API sends locale-free paths; each one is expanded to
 * every locale here (ADR-008 §4.3), so adding a locale needs no API change.
 */
export async function POST(request: Request) {
  const secret = request.headers.get("x-revalidate-secret");
  if (!isValidSecret(secret, process.env.REVALIDATE_SECRET)) {
    return Response.json(
      { code: 401, message: "Invalid revalidate secret", error: [] },
      { status: 401 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    raw = undefined;
  }
  const parsed = parseRevalidateBody(raw);
  if (!parsed.ok) {
    return Response.json(
      { code: 400, message: "Validation failed", error: [{ field: "paths", message: parsed.message }] },
      { status: 400 },
    );
  }

  const expanded = expandRevalidatePaths(parsed.paths, locales);
  for (const path of expanded) revalidatePath(path);

  logger.info("revalidate", { paths: parsed.paths, expanded: expanded.length });
  return Response.json({ revalidated: true, paths: expanded });
}
