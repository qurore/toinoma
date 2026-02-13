import { describe, it, expect } from "vitest";
import {
  questionRubricSchema,
  sectionRubricSchema,
  problemSetRubricSchema,
} from "./rubric-schemas";

describe("questionRubricSchema", () => {
  it("accepts valid essay rubric", () => {
    const result = questionRubricSchema.safeParse({
      type: "essay",
      number: "(1)",
      points: 10,
      rubricElements: [
        { element: "Reference to Treaty of Westphalia", points: 3 },
        { element: "Logical coherence", points: 7 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts essay rubric with modelAnswer", () => {
    const result = questionRubricSchema.safeParse({
      type: "essay",
      number: "(1)",
      points: 10,
      rubricElements: [{ element: "Key concept", points: 10 }],
      modelAnswer: "The expected answer is...",
    });
    expect(result.success).toBe(true);
  });

  it("rejects essay rubric with empty rubricElements", () => {
    const result = questionRubricSchema.safeParse({
      type: "essay",
      number: "(1)",
      points: 10,
      rubricElements: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid mark_sheet rubric", () => {
    const result = questionRubricSchema.safeParse({
      type: "mark_sheet",
      number: "(2)",
      points: 5,
      correctAnswer: "B",
      choices: ["A", "B", "C", "D"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects mark_sheet with fewer than 2 choices", () => {
    const result = questionRubricSchema.safeParse({
      type: "mark_sheet",
      number: "(2)",
      points: 5,
      correctAnswer: "A",
      choices: ["A"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid fill_in_blank rubric", () => {
    const result = questionRubricSchema.safeParse({
      type: "fill_in_blank",
      number: "(3)",
      points: 3,
      acceptedAnswers: ["Tokyo", "東京"],
      caseSensitive: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects fill_in_blank with empty acceptedAnswers", () => {
    const result = questionRubricSchema.safeParse({
      type: "fill_in_blank",
      number: "(3)",
      points: 3,
      acceptedAnswers: [],
      caseSensitive: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative points", () => {
    const result = questionRubricSchema.safeParse({
      type: "essay",
      number: "(1)",
      points: -5,
      rubricElements: [{ element: "Test", points: 5 }],
    });
    expect(result.success).toBe(false);
  });
});

describe("sectionRubricSchema", () => {
  it("accepts valid section with multiple question types", () => {
    const result = sectionRubricSchema.safeParse({
      number: 1,
      points: 30,
      questions: [
        {
          type: "essay",
          number: "(1)",
          points: 20,
          rubricElements: [{ element: "Key concept", points: 20 }],
        },
        {
          type: "mark_sheet",
          number: "(2)",
          points: 5,
          correctAnswer: "C",
          choices: ["A", "B", "C", "D"],
        },
        {
          type: "fill_in_blank",
          number: "(3)",
          points: 5,
          acceptedAnswers: ["42"],
          caseSensitive: false,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects section with zero questions", () => {
    const result = sectionRubricSchema.safeParse({
      number: 1,
      points: 0,
      questions: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects section number less than 1", () => {
    const result = sectionRubricSchema.safeParse({
      number: 0,
      points: 10,
      questions: [
        {
          type: "essay",
          number: "(1)",
          points: 10,
          rubricElements: [{ element: "Test", points: 10 }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("problemSetRubricSchema", () => {
  it("accepts valid problem set rubric", () => {
    const result = problemSetRubricSchema.safeParse({
      sections: [
        {
          number: 1,
          points: 50,
          questions: [
            {
              type: "essay",
              number: "(1)",
              points: 50,
              rubricElements: [
                { element: "Core argument", points: 25 },
                { element: "Supporting evidence", points: 25 },
              ],
            },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty sections array", () => {
    const result = problemSetRubricSchema.safeParse({
      sections: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing sections field", () => {
    const result = problemSetRubricSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
