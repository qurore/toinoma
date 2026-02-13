import { z } from "zod";

export const gradingResultSchema = z.object({
  totalScore: z.number().describe("Total score across all sections"),
  maxScore: z.number().describe("Maximum possible score"),
  sections: z.array(
    z.object({
      number: z.number(),
      score: z.number(),
      maxScore: z.number(),
      questions: z.array(
        z.object({
          number: z.string(),
          score: z.number(),
          maxScore: z.number(),
          feedback: z.string().describe("Detailed feedback for this question"),
          rubricMatches: z.array(
            z.object({
              element: z.string(),
              matched: z.boolean(),
              pointsAwarded: z.number(),
              pointsPossible: z.number(),
              explanation: z.string(),
            })
          ),
        })
      ),
    })
  ),
  overallFeedback: z
    .string()
    .describe("Overall feedback and improvement advice"),
});

export type GradingResult = z.infer<typeof gradingResultSchema>;

export {
  essayAnswerSchema,
  markSheetAnswerSchema,
  fillInBlankAnswerSchema,
  questionAnswerSchema,
  type EssayAnswer,
  type MarkSheetAnswer,
  type FillInBlankAnswer,
  type QuestionAnswer,
} from "./answer-schemas";

export {
  questionRubricSchema,
  sectionRubricSchema,
  problemSetRubricSchema,
  type QuestionRubric,
  type SectionRubric,
  type ProblemSetRubric,
} from "./rubric-schemas";

export {
  tosAcceptanceSchema,
  sellerProfileSchema,
  type TosAcceptanceInput,
  type SellerProfileInput,
} from "./seller-schemas";
