import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const gradingResultSchema = z.object({
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

export async function gradeSubmission({
  rubric,
  studentAnswers,
  problemImages,
}: {
  rubric: Record<string, unknown>;
  studentAnswers: Record<string, string>;
  problemImages?: string[];
}) {
  const systemPrompt = `You are an expert exam grader. Grade the student's answers strictly according to the provided rubric.

Rules:
- Award partial credit where the rubric allows it
- For essay questions, check for each rubric element's presence and evaluate logical coherence
- For math questions, verify each step and check the final answer
- Be fair but strict — do not award points for vague or tangential responses
- Provide constructive feedback for each question
- All scores must be integers

Rubric:
${JSON.stringify(rubric, null, 2)}`;

  let prompt = `Student answers:\n${JSON.stringify(studentAnswers, null, 2)}`;

  if (problemImages?.length) {
    prompt =
      "The following images show the student's handwritten answers.\n\n" +
      prompt;
  }

  const { object } = await generateObject({
    model: google("gemini-2.0-flash"),
    schema: gradingResultSchema,
    system: systemPrompt,
    prompt,
  });

  return object;
}
