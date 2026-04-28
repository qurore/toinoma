import { describe, it, expect } from "vitest";
import {
  MANIFEST,
  validateManifest,
  summarizeManifest,
} from "../data/manifest";

describe("manifest", () => {
  it("validateManifest passes for all 11 sets", () => {
    expect(() => validateManifest()).not.toThrow();
  });

  it("contains exactly 11 problem sets", () => {
    expect(MANIFEST).toHaveLength(11);
  });

  it("maps math_humanities and math_sciences both to 'math' enum", () => {
    const mathSets = MANIFEST.filter((s) => s.dbSubject === "math");
    expect(mathSets).toHaveLength(2);
    expect(mathSets.map((s) => s.subjectSlug).sort()).toEqual([
      "math_humanities",
      "math_sciences",
    ]);
  });

  it("maps japanese_humanities and japanese_sciences both to 'japanese' enum", () => {
    const jpSets = MANIFEST.filter((s) => s.dbSubject === "japanese");
    expect(jpSets).toHaveLength(2);
    expect(jpSets.map((s) => s.subjectSlug).sort()).toEqual([
      "japanese_humanities",
      "japanese_sciences",
    ]);
  });

  it("distributes difficulty across hard and medium for filter testability", () => {
    const summary = MANIFEST.reduce<Record<string, number>>((acc, s) => {
      acc[s.difficulty] = (acc[s.difficulty] ?? 0) + 1;
      return acc;
    }, {});
    expect(summary.hard).toBeGreaterThanOrEqual(2);
    expect(summary.medium).toBeGreaterThanOrEqual(2);
  });

  it("includes mark_sheet and fill_in_blank question types (not essay-only)", () => {
    const summary = summarizeManifest();
    expect(summary.questionTypeCounts.mark_sheet).toBeGreaterThan(0);
    expect(summary.questionTypeCounts.fill_in_blank).toBeGreaterThan(0);
    expect(summary.questionTypeCounts.essay).toBeGreaterThan(0);
  });

  it("every question has unique ordinal within its set", () => {
    for (const set of MANIFEST) {
      const ordinals = set.questions.map((q) => q.ordinal);
      const unique = new Set(ordinals);
      expect(unique.size, `set ${set.subjectSlug} has duplicate ordinals`).toBe(
        ordinals.length
      );
    }
  });

  it("every question has a natural-key topic_tag", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        const expected = `seed:utokyo-2026:${set.subjectSlug}:${q.ordinal}`;
        expect(q.topicTags).toContain(expected);
      }
    }
  });

  it("at least one essay question per applicable subject is marked photo-preferred", () => {
    let photoMarkedCount = 0;
    for (const set of MANIFEST) {
      const hasPhotoMark = set.questions.some(
        (q) =>
          q.questionType === "essay" &&
          q.topicTags.includes("submission-mode:photo-preferred")
      );
      if (hasPhotoMark) photoMarkedCount += 1;
    }
    expect(photoMarkedCount).toBeGreaterThanOrEqual(11);
  });

  it("all titles fit visual-width contract (<=24 columns)", () => {
    function visualWidth(s: string): number {
      let w = 0;
      for (const ch of s) {
        const c = ch.codePointAt(0) ?? 0;
        const wide =
          (c >= 0x1100 && c <= 0x115f) ||
          (c >= 0x2e80 && c <= 0x9fff) ||
          (c >= 0xff00 && c <= 0xff60);
        w += wide ? 2 : 1;
      }
      return w;
    }
    for (const set of MANIFEST) {
      expect(visualWidth(set.title), `title "${set.title}"`).toBeLessThanOrEqual(24);
    }
  });
});
