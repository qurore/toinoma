import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import {
  gradingResultSchema,
  type GradingResult,
} from "@toinoma/shared/schemas";

export type { GradingResult };

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
