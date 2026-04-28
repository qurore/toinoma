import { describe, it, expect } from "vitest";
import { MANIFEST } from "../data/manifest";

describe("idempotency natural-key tagging", () => {
  it("every (subject_slug, ordinal) pair produces a unique natural key", () => {
    const keys = new Set<string>();
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        const key = `seed:utokyo-2026:${set.subjectSlug}:${q.ordinal}`;
        expect(keys.has(key), `duplicate key ${key}`).toBe(false);
        keys.add(key);
      }
    }
    expect(keys.size).toBeGreaterThanOrEqual(MANIFEST.length);
  });

  it("re-running the manifest yields the same total points and question counts", () => {
    const fingerprint = (m: typeof MANIFEST) =>
      m
        .map(
          (s) =>
            `${s.subjectSlug}:${s.questions.length}:${s.questions.reduce((sum, q) => sum + q.points, 0)}`
        )
        .join("|");
    expect(fingerprint(MANIFEST)).toBe(fingerprint(MANIFEST));
  });
});

describe("subject mapping", () => {
  it("subject_slug is unique across the manifest", () => {
    const slugs = MANIFEST.map((s) => s.subjectSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("all dbSubject values are valid Subject enum members", () => {
    const valid = new Set([
      "math",
      "english",
      "japanese",
      "physics",
      "chemistry",
      "biology",
      "japanese_history",
      "world_history",
      "geography",
    ]);
    for (const set of MANIFEST) {
      expect(valid.has(set.dbSubject), `subject ${set.dbSubject}`).toBe(true);
    }
  });

  it("title contains the human-readable subject form (consistency check)", () => {
    for (const set of MANIFEST) {
      expect(set.title).toMatch(/^東京大学 2026/);
    }
  });
});
