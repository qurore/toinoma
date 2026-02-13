import { z } from "zod";

const rubricElementSchema = z.object({
  element: z.string().min(1),
  points: z.number().int().min(0),
});

const essayQuestionRubricSchema = z.object({
  type: z.literal("essay"),
  number: z.string(),
  points: z.number().int().min(0),
  rubricElements: z.array(rubricElementSchema).min(1),
  modelAnswer: z.string().optional(),
});

const markSheetQuestionRubricSchema = z.object({
  type: z.literal("mark_sheet"),
  number: z.string(),
  points: z.number().int().min(0),
  correctAnswer: z.string().min(1),
  choices: z.array(z.string()).min(2),
});

const fillInBlankQuestionRubricSchema = z.object({
  type: z.literal("fill_in_blank"),
  number: z.string(),
  points: z.number().int().min(0),
  acceptedAnswers: z.array(z.string()).min(1),
  caseSensitive: z.boolean(),
});

export const questionRubricSchema = z.discriminatedUnion("type", [
  essayQuestionRubricSchema,
  markSheetQuestionRubricSchema,
  fillInBlankQuestionRubricSchema,
]);

export const sectionRubricSchema = z.object({
  number: z.number().int().min(1),
  points: z.number().int().min(0),
  questions: z.array(questionRubricSchema).min(1),
});

export const problemSetRubricSchema = z.object({
  sections: z.array(sectionRubricSchema).min(1),
});

export type QuestionRubric = z.infer<typeof questionRubricSchema>;
export type SectionRubric = z.infer<typeof sectionRubricSchema>;
export type ProblemSetRubric = z.infer<typeof problemSetRubricSchema>;
