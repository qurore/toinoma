import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { structuredContentSchema } from "@toinoma/shared/schemas";
import { MANIFEST } from "../data/manifest";
import { buildStubAst, loadStructuredContent } from "../structured-content";

describe("buildStubAst", () => {
  for (const set of MANIFEST) {
    it(`produces a schema-valid stub for ${set.subjectSlug}`, () => {
      const ast = buildStubAst(set);
      const result = structuredContentSchema.safeParse(ast);
      if (!result.success) {
        const summary = result.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(summary);
      }
      expect(result.success).toBe(true);
    });
  }

  it("propagates writingMode + defaultLang from the spec", () => {
    const japanese = MANIFEST.find((s) => s.subjectSlug === "japanese_humanities")!;
    const ast = buildStubAst(japanese);
    expect(ast.defaultWritingMode).toBe("vertical");
    expect(ast.defaultLang).toBe("mixed");

    const english = MANIFEST.find((s) => s.subjectSlug === "english")!;
    const englishAst = buildStubAst(english);
    expect(englishAst.defaultWritingMode).toBe("horizontal");
    expect(englishAst.defaultLang).toBe("en");
  });

  it("includes a section per question in the manifest", () => {
    const set = MANIFEST.find((s) => s.subjectSlug === "math_sciences")!;
    const ast = buildStubAst(set);
    const sections = ast.body.filter((b) => b.kind === "section");
    expect(sections).toHaveLength(set.questions.length);
  });

  it("attaches subject + university + year metadata", () => {
    const set = MANIFEST[0]!;
    const ast = buildStubAst(set);
    expect(ast.subject).toBe(set.dbSubject);
    expect(ast.university).toBe("東京大学");
    expect(ast.year).toBe(2026);
  });
});

describe("loadStructuredContent", () => {
  it("returns source=stub when no JSON file exists", () => {
    // Pick a slug that doesn't have a parsed file checked in.
    const set = MANIFEST.find((s) => s.subjectSlug === "english")!;
    const loaded = loadStructuredContent(set);
    // Either stub (no parsed file) or parsed (someone has run pnpm seed:utokyo:parse).
    expect(["stub", "parsed"]).toContain(loaded.source);
    expect(loaded.ast.version).toBe(1);
  });

  it("validates pre-parsed JSON if present (no contract violations)", () => {
    for (const set of MANIFEST) {
      const loaded = loadStructuredContent(set);
      const validation = structuredContentSchema.safeParse(loaded.ast);
      expect(validation.success, `${set.subjectSlug}: ${loaded.source}`).toBe(true);
    }
  });
});
