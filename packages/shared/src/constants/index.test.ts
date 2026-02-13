import { describe, it, expect } from "vitest";
import {
  SUBJECTS,
  DIFFICULTIES,
  SUBJECT_LABELS,
  DIFFICULTY_LABELS,
  ANSWER_TYPES,
  ANSWER_TYPE_LABELS,
} from "./index";

describe("SUBJECTS", () => {
  it("contains exactly 9 subjects", () => {
    expect(SUBJECTS).toHaveLength(9);
  });

  it("contains all expected subject values", () => {
    const expected = [
      "math",
      "english",
      "japanese",
      "physics",
      "chemistry",
      "biology",
      "japanese_history",
      "world_history",
      "geography",
    ];
    expect([...SUBJECTS]).toEqual(expected);
  });
});

describe("DIFFICULTIES", () => {
  it("contains exactly 3 difficulties", () => {
    expect(DIFFICULTIES).toHaveLength(3);
  });

  it("contains easy, medium, hard in order", () => {
    expect([...DIFFICULTIES]).toEqual(["easy", "medium", "hard"]);
  });
});

describe("SUBJECT_LABELS", () => {
  it("has a label for every subject", () => {
    for (const subject of SUBJECTS) {
      expect(SUBJECT_LABELS[subject]).toBeDefined();
      expect(typeof SUBJECT_LABELS[subject]).toBe("string");
      expect(SUBJECT_LABELS[subject].length).toBeGreaterThan(0);
    }
  });

  it("maps math to 数学", () => {
    expect(SUBJECT_LABELS.math).toBe("数学");
  });
});

describe("DIFFICULTY_LABELS", () => {
  it("has a label for every difficulty", () => {
    for (const difficulty of DIFFICULTIES) {
      expect(DIFFICULTY_LABELS[difficulty]).toBeDefined();
      expect(typeof DIFFICULTY_LABELS[difficulty]).toBe("string");
      expect(DIFFICULTY_LABELS[difficulty].length).toBeGreaterThan(0);
    }
  });

  it("maps easy to 基礎", () => {
    expect(DIFFICULTY_LABELS.easy).toBe("基礎");
  });
});

describe("ANSWER_TYPES", () => {
  it("contains exactly 3 answer types", () => {
    expect(ANSWER_TYPES).toHaveLength(3);
  });

  it("contains essay, mark_sheet, fill_in_blank in order", () => {
    expect([...ANSWER_TYPES]).toEqual([
      "essay",
      "mark_sheet",
      "fill_in_blank",
    ]);
  });
});

describe("ANSWER_TYPE_LABELS", () => {
  it("has a label for every answer type", () => {
    for (const answerType of ANSWER_TYPES) {
      expect(ANSWER_TYPE_LABELS[answerType]).toBeDefined();
      expect(typeof ANSWER_TYPE_LABELS[answerType]).toBe("string");
      expect(ANSWER_TYPE_LABELS[answerType].length).toBeGreaterThan(0);
    }
  });

  it("maps essay to 記述式", () => {
    expect(ANSWER_TYPE_LABELS.essay).toBe("記述式");
  });

  it("maps mark_sheet to マークシート", () => {
    expect(ANSWER_TYPE_LABELS.mark_sheet).toBe("マークシート");
  });
});
