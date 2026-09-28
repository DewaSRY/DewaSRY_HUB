import { describe, expect, it } from "vitest";
import { taxonomySchema } from "./schema";

describe("taxonomySchema", () => {
  it("accepts a name with an optional slug", () => {
    expect(taxonomySchema.safeParse({ name: "DevOps", slug: "" }).success).toBe(true);
    expect(taxonomySchema.safeParse({ name: "DevOps", slug: "dev-ops" }).success).toBe(true);
  });
  it("rejects bad input with i18n keys", () => {
    const empty = taxonomySchema.safeParse({ name: " ", slug: "" });
    expect(empty.success).toBe(false);
    expect(empty.error?.issues[0]?.message).toBe("taxonomy.errors.nameRequired");
    const slug = taxonomySchema.safeParse({ name: "x", slug: "Dev Ops" });
    expect(slug.error?.issues[0]?.message).toBe("taxonomy.errors.slugFormat");
  });
});
