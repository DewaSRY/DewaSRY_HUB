import { z } from "zod";
import { COMMENT_MAX_LENGTH } from "./type";
import { codePointLength } from "./utils";

/** The comment box text (`@Name` form). The API checks the stored body again (ADR-010 §7.3). */
export const commentSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "comment.errors.required")
    .refine((value) => codePointLength(value) <= COMMENT_MAX_LENGTH, `comment.errors.tooLong::max:${COMMENT_MAX_LENGTH}`),
});

export type CommentFormValues = z.infer<typeof commentSchema>;
