import { z } from "zod";

/** Name 1–80 chars; slug optional (generated from the name), lowercase `a-z0-9-`. */
export const taxonomySchema = z.object({
  name: z.string().trim().min(1, "taxonomy.errors.nameRequired").max(80, "taxonomy.errors.nameTooLong"),
  slug: z
    .string()
    .trim()
    .max(120, "taxonomy.errors.slugTooLong")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$|^$/, "taxonomy.errors.slugFormat"),
});

export type TaxonomyFormValues = z.infer<typeof taxonomySchema>;
