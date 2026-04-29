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

// Essay variant for the discriminated union — includes the same refinement
// as essayAnswerSchema to ensure either text or imageUrl is provided.
const essayAnswerVariant = z.object({
  type: z.literal("essay"),
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export const questionAnswerSchema = z.discriminatedUnion("type", [
  essayAnswerVariant,
  markSheetAnswerSchema,
  fillInBlankAnswerSchema,
  multipleChoiceAnswerSchema,
]).superRefine((data, ctx) => {
  if (data.type === "essay" && data.text === undefined && data.imageUrl === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either text or imageUrl must be provided",
      path: ["text"],
    });
  }
});

export type EssayAnswer = z.infer<typeof essayAnswerSchema>;
export type MarkSheetAnswer = z.infer<typeof markSheetAnswerSchema>;
export type FillInBlankAnswer = z.infer<typeof fillInBlankAnswerSchema>;
export type MultipleChoiceAnswer = z.infer<typeof multipleChoiceAnswerSchema>;
export type QuestionAnswer = z.infer<typeof questionAnswerSchema>;

// ---------------------------------------------------------------------------
// Draft answer schemas (FR-D6: submission drafts)
// ---------------------------------------------------------------------------
// Drafts are saved continuously as the user types, so we relax the validation
// rules used at submission time:
//   - Essays may have neither text nor imageUrl (mid-typing, blank field).
//   - Mark-sheet / multiple-choice may have an empty selection
//     (deselected mid-flow).
//   - Fill-in-blank text may be the empty string.
// We still enforce the `type` discriminator so drafts can be safely typed
// downstream and displayed in the answer input components.

const draftEssayAnswerVariant = z.object({
  type: z.literal("essay"),
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const draftMarkSheetAnswerVariant = z.object({
  type: z.literal("mark_sheet"),
  selected: z.string(),
});

const draftFillInBlankAnswerVariant = z.object({
  type: z.literal("fill_in_blank"),
  text: z.string(),
});

const draftMultipleChoiceAnswerVariant = z.object({
  type: z.literal("multiple_choice"),
  selected: z.array(z.string()),
});

export const draftAnswerSchema = z.discriminatedUnion("type", [
  draftEssayAnswerVariant,
  draftMarkSheetAnswerVariant,
  draftFillInBlankAnswerVariant,
  draftMultipleChoiceAnswerVariant,
]);

// Map keyed by question id (e.g. "1-(1)") → DraftAnswer
export const draftAnswersMapSchema = z.record(z.string(), draftAnswerSchema);

export type DraftAnswer = z.infer<typeof draftAnswerSchema>;
export type DraftAnswersMap = z.infer<typeof draftAnswersMapSchema>;
