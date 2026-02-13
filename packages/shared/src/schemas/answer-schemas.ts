import { z } from "zod";

export const essayAnswerSchema = z
  .object({
    type: z.literal("essay"),
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
  })
  .refine((data) => data.text !== undefined || data.imageUrl !== undefined, {
    message: "Either text or imageUrl must be provided",
  });

export const markSheetAnswerSchema = z.object({
  type: z.literal("mark_sheet"),
  selected: z.string().min(1),
});

export const fillInBlankAnswerSchema = z.object({
  type: z.literal("fill_in_blank"),
  text: z.string(),
});

export const questionAnswerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("essay"),
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
  }),
  markSheetAnswerSchema,
  fillInBlankAnswerSchema,
]);

export type EssayAnswer = z.infer<typeof essayAnswerSchema>;
export type MarkSheetAnswer = z.infer<typeof markSheetAnswerSchema>;
export type FillInBlankAnswer = z.infer<typeof fillInBlankAnswerSchema>;
export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;
