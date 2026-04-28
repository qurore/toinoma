import { describe, it, expect } from "vitest";
import { MANIFEST } from "../data/manifest";

// BR2 #A1/C4 regression guard: every questionText must be plain text — no HTML tags.
describe("questionText plain-text contract", () => {
  it("contains zero raw HTML tags", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        expect(
          q.questionText,
          `${set.subjectSlug} q=${q.ordinal}: contains < character (HTML tag?)`
        ).not.toMatch(/<[a-zA-Z!\/]/);
      }
    }
  });

  it("contains zero closing HTML tags", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        expect(
          q.questionText,
          `${set.subjectSlug} q=${q.ordinal}: contains </ closing tag`
        ).not.toMatch(/<\//);
      }
    }
  });

  it("modelAnswer also contains no HTML markup", () => {
    for (const set of MANIFEST) {
      for (const q of set.questions) {
        const ma = q.modelAnswer;
        expect(ma, `${set.subjectSlug} q=${q.ordinal}`).not.toMatch(/<[a-zA-Z]/);
      }
    }
  });
});
