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
  multipleChoiceAnswerSchema,
  questionAnswerSchema,
  draftAnswerSchema,
  draftAnswersMapSchema,
  type EssayAnswer,
  type MarkSheetAnswer,
  type FillInBlankAnswer,
  type MultipleChoiceAnswer,
  type QuestionAnswer,
  type DraftAnswer,
  type DraftAnswersMap,
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

export {
  tierOverrideMetadataSchema,
  aiUsageAdjustmentMetadataSchema,
  type TierOverrideMetadata,
  type AiUsageAdjustmentMetadata,
} from "./admin-audit";

export {
  structuredContentSchema,
  numberingStyleSchema,
  writingModeSchema,
  passageLangSchema,
  answerTypeSchema,
  kanbunTokenSchema,
  kanbunLineSchema,
  kaeritenSchema,
  INLINE_NODE_SCHEMA,
  BLOCK_NODE_SCHEMA,
  QUESTION_SCHEMA,
  type StructuredContent,
  type NumberingStyle,
  type WritingMode,
  type PassageLang,
  type StructuredAnswerType,
  type Kaeriten,
  type KanbunToken,
  type KanbunLine,
  type InlineNode,
  type InlineText,
  type InlineRuby,
  type InlineEm,
  type InlineStrong,
  type InlineKakko,
  type InlineUnderline,
  type InlineBlank,
  type InlineMath,
  type InlineRef,
  type InlineForeign,
  type InlineLineBreak,
  type BlockNode,
  type BlockSection,
  type BlockSubsection,
  type BlockPassage,
  type BlockInstruction,
  type BlockParagraph,
  type BlockKanbun,
  type BlockMathDisplay,
  type BlockFigure,
  type BlockTable,
  type BlockChoices,
  type BlockRearrange,
  type BlockAudio,
  type BlockFootnoteSection,
  type BlockCitation,
  type BlockSpacer,
  type BlockQuestionGroup,
  type Question,
  type QuestionConstraint,
  type TableCellSpec,
} from "./structured-content-schemas";
