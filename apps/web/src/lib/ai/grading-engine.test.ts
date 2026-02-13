// @vitest-environment node
import { describe, it, expect } from "vitest";
import type { ProblemSetRubric, QuestionAnswer } from "@toinoma/shared/schemas";

// We test the deterministic parts of the grading engine.
// The AI (essay) grading can't be unit tested without mocking the model.
// We import the module to test the exported gradeSubmission function
// but only exercise the deterministic paths.

// Since gradeMarkSheet and gradeFillInBlank are not exported,
// we test them through gradeSubmission with rubrics containing only those types.

// Mock the AI SDK to avoid actual API calls
import { vi } from "vitest";
vi.mock("ai", () => ({
  generateObject: vi.fn(),
}));
vi.mock("@ai-sdk/google", () => ({
  google: vi.fn(),
}));

// Import after mocking
const { gradeSubmission } = await import("./grading-engine");

describe("gradeSubmission — mark_sheet (FR-005)", () => {
  const rubric: ProblemSetRubric = {
    sections: [
      {
        number: 1,
        points: 10,
        questions: [
          {
            type: "mark_sheet",
            number: "(1)",
            points: 5,
            correctAnswer: "B",
            choices: ["A", "B", "C", "D"],
          },
          {
            type: "mark_sheet",
            number: "(2)",
            points: 5,
            correctAnswer: "C",
            choices: ["A", "B", "C", "D"],
          },
        ],
      },
    ],
  };

  it("awards full points for correct mark-sheet answers", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "mark_sheet", selected: "B" },
      "1-(2)": { type: "mark_sheet", selected: "C" },
    };

    const result = await gradeSubmission({ rubric, answers });

    expect(result.totalScore).toBe(10);
    expect(result.maxScore).toBe(10);
    expect(result.sections[0].questions[0].score).toBe(5);
    expect(result.sections[0].questions[1].score).toBe(5);
  });

  it("awards zero for incorrect mark-sheet answers", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "mark_sheet", selected: "A" },
      "1-(2)": { type: "mark_sheet", selected: "D" },
    };

    const result = await gradeSubmission({ rubric, answers });

    expect(result.totalScore).toBe(0);
    expect(result.maxScore).toBe(10);
    expect(result.sections[0].questions[0].feedback).toContain("不正解");
    expect(result.sections[0].questions[0].feedback).toContain("B");
  });

  it("handles mixed correct/incorrect answers", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "mark_sheet", selected: "B" },
      "1-(2)": { type: "mark_sheet", selected: "A" },
    };

    const result = await gradeSubmission({ rubric, answers });

    expect(result.totalScore).toBe(5);
    expect(result.sections[0].questions[0].score).toBe(5);
    expect(result.sections[0].questions[1].score).toBe(0);
  });
});

describe("gradeSubmission — fill_in_blank (FR-007)", () => {
  const rubric: ProblemSetRubric = {
    sections: [
      {
        number: 1,
        points: 15,
        questions: [
          {
            type: "fill_in_blank",
            number: "(1)",
            points: 5,
            acceptedAnswers: ["Tokyo", "東京"],
            caseSensitive: false,
          },
          {
            type: "fill_in_blank",
            number: "(2)",
            points: 5,
            acceptedAnswers: ["H2O"],
            caseSensitive: true,
          },
          {
            type: "fill_in_blank",
            number: "(3)",
            points: 5,
            acceptedAnswers: ["42"],
            caseSensitive: false,
          },
        ],
      },
    ],
  };

  it("accepts correct answers (case-insensitive)", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "fill_in_blank", text: "tokyo" },
      "1-(2)": { type: "fill_in_blank", text: "H2O" },
      "1-(3)": { type: "fill_in_blank", text: "42" },
    };

    const result = await gradeSubmission({ rubric, answers });

    expect(result.totalScore).toBe(15);
    expect(result.maxScore).toBe(15);
  });

  it("accepts alternative accepted answers", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "fill_in_blank", text: "東京" },
      "1-(2)": { type: "fill_in_blank", text: "H2O" },
      "1-(3)": { type: "fill_in_blank", text: "42" },
    };

    const result = await gradeSubmission({ rubric, answers });

    expect(result.totalScore).toBe(15);
  });

  it("rejects wrong case when caseSensitive is true", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "fill_in_blank", text: "Tokyo" },
      "1-(2)": { type: "fill_in_blank", text: "h2o" },
      "1-(3)": { type: "fill_in_blank", text: "42" },
    };

    const result = await gradeSubmission({ rubric, answers });

    expect(result.totalScore).toBe(10);
    expect(result.sections[0].questions[1].score).toBe(0);
    expect(result.sections[0].questions[1].feedback).toContain("不正解");
  });

  it("trims whitespace before comparison", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "fill_in_blank", text: "  Tokyo  " },
      "1-(2)": { type: "fill_in_blank", text: " H2O " },
      "1-(3)": { type: "fill_in_blank", text: " 42 " },
    };

    const result = await gradeSubmission({ rubric, answers });

    expect(result.totalScore).toBe(15);
  });
});

describe("gradeSubmission — missing answers", () => {
  const rubric: ProblemSetRubric = {
    sections: [
      {
        number: 1,
        points: 10,
        questions: [
          {
            type: "mark_sheet",
            number: "(1)",
            points: 5,
            correctAnswer: "A",
            choices: ["A", "B", "C"],
          },
          {
            type: "fill_in_blank",
            number: "(2)",
            points: 5,
            acceptedAnswers: ["test"],
            caseSensitive: false,
          },
        ],
      },
    ],
  };

  it("gives zero for unanswered questions", async () => {
    const result = await gradeSubmission({ rubric, answers: {} });

    expect(result.totalScore).toBe(0);
    expect(result.maxScore).toBe(10);
    expect(result.sections[0].questions[0].feedback).toBe("未回答です。");
    expect(result.sections[0].questions[1].feedback).toBe("未回答です。");
  });
});

describe("gradeSubmission — overall feedback (deterministic)", () => {
  const rubric: ProblemSetRubric = {
    sections: [
      {
        number: 1,
        points: 10,
        questions: [
          {
            type: "mark_sheet",
            number: "(1)",
            points: 10,
            correctAnswer: "A",
            choices: ["A", "B"],
          },
        ],
      },
    ],
  };

  it("gives perfect score feedback when all correct", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "mark_sheet", selected: "A" },
    };

    const result = await gradeSubmission({ rubric, answers });
    expect(result.overallFeedback).toContain("全問正解");
  });

  it("gives low score feedback when all wrong", async () => {
    const answers: Record<string, QuestionAnswer> = {
      "1-(1)": { type: "mark_sheet", selected: "B" },
    };

    const result = await gradeSubmission({ rubric, answers });
    expect(result.overallFeedback).toContain("復習");
  });
});
