import { describe, it, expect } from "vitest";
import {
  questionRubricSchema,
  problemSetRubricSchema,
} from "@toinoma/shared/schemas";
import { MANIFEST } from "../data/manifest";

describe("rubrics", () => {
  it("every per-question rubric matches questionRubricSchema", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        const result = questionRubricSchema.safeParse(q.rubric);
        if (!result.success) {
          throw new Error(
            `${set.subjectSlug} q=${q.ordinal} rubric invalid: ${JSON.stringify(result.error.issues)}`
          );
        }
        expect(result.success).toBe(true);
      }
    }
  });

  it("aggregated set-level rubric matches problemSetRubricSchema", () => {
    for (const set of MANIFEST) {
      const aggregated = {
        sections: set.questions.map((q, idx) => ({
          number: idx + 1,
          points: q.points,
          questions: [q.rubric],
        })),
      };
      const result = problemSetRubricSchema.safeParse(aggregated);
      if (!result.success) {
        throw new Error(
          `${set.subjectSlug} aggregated rubric invalid: ${JSON.stringify(result.error.issues)}`
        );
      }
      expect(result.success).toBe(true);
    }
  });

  it("essay rubrics have at least 3 rubric elements", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        if (q.rubric.type === "essay") {
          expect(q.rubric.rubricElements.length, `${set.subjectSlug} q=${q.ordinal}`).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });

  it("essay rubric element points sum equals question points", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        if (q.rubric.type === "essay") {
          const sum = q.rubric.rubricElements.reduce(
            (acc: number, el: { points: number }) => acc + el.points,
            0
          );
          expect(sum, `${set.subjectSlug} q=${q.ordinal}: rubric element sum`).toBe(q.points);
        }
      }
    }
  });

  it("mark_sheet rubrics have correctAnswer in choices", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        if (q.rubric.type === "mark_sheet") {
          const correct = q.rubric.correctAnswer;
          const correctMatchesOption = q.rubric.choices.some((choice: string) =>
            choice.startsWith(correct)
          );
          expect(correctMatchesOption, `${set.subjectSlug} q=${q.ordinal}`).toBe(true);
        }
      }
    }
  });

  it("fill_in_blank rubrics have at least one accepted answer", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        if (q.rubric.type === "fill_in_blank") {
          expect(q.rubric.acceptedAnswers.length).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});
