import { describe, it, expect } from "vitest";
import { gradingResultSchema } from "./index";
import type { GradingResult } from "./index";

const validResult: GradingResult = {
  totalScore: 75,
  maxScore: 100,
  sections: [
    {
      number: 1,
      score: 75,
      maxScore: 100,
      questions: [
        {
          number: "(1)",
          score: 8,
          maxScore: 10,
          feedback: "Good understanding of the core concept.",
          rubricMatches: [
            {
              element: "Reference to Treaty of Westphalia",
              matched: true,
              pointsAwarded: 3,
              pointsPossible: 3,
              explanation: "Correctly referenced the treaty.",
            },
            {
              element: "Logical coherence",
              matched: true,
              pointsAwarded: 5,
              pointsPossible: 7,
              explanation: "Minor logical gap in second paragraph.",
            },
          ],
        },
      ],
    },
  ],
  overallFeedback: "Strong performance with room for improvement.",
};

describe("gradingResultSchema", () => {
  it("validates a complete grading result", () => {
    const result = gradingResultSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it("validates with empty sections array", () => {
    const result = gradingResultSchema.safeParse({
      totalScore: 0,
      maxScore: 0,
      sections: [],
      overallFeedback: "No sections to grade.",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing totalScore", () => {
    const { totalScore: _, ...invalid } = validResult;
    const result = gradingResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing sections", () => {
    const { sections: _, ...invalid } = validResult;
    const result = gradingResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects missing overallFeedback", () => {
    const { overallFeedback: _, ...invalid } = validResult;
    const result = gradingResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("rejects rubricMatch missing matched boolean", () => {
    const invalid = {
      ...validResult,
      sections: [
        {
          ...validResult.sections[0],
          questions: [
            {
              ...validResult.sections[0].questions[0],
              rubricMatches: [
                {
                  element: "Test",
                  // matched: missing
                  pointsAwarded: 3,
                  pointsPossible: 3,
                  explanation: "Test",
                },
              ],
            },
          ],
        },
      ],
    };
    const result = gradingResultSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
