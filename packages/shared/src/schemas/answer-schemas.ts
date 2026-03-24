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

export const multipleChoiceAnswerSchema = z.object({
  type: z.literal("multiple_choice"),
  selected: z.array(z.string()).min(1),
});

export const questionAnswerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("essay"),
    text: z.string().optional(),
    imageUrl: z.string().url().optional(),
  }),
  markSheetAnswerSchema,
  fillInBlankAnswerSchema,
  multipleChoiceAnswerSchema,
]);

export type EssayAnswer = z.infer<typeof essayAnswerSchema>;
export type MarkSheetAnswer = z.infer<typeof markSheetAnswerSchema>;
export type FillInBlankAnswer = z.infer<typeof fillInBlankAnswerSchema>;
export type MultipleChoiceAnswer = z.infer<typeof multipleChoiceAnswerSchema>;
export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;
