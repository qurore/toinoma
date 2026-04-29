// @vitest-environment node
import { describe, it, expect } from "vitest";
import type { StructuredContent } from "@toinoma/shared/schemas";
import {
  validateAst,
  tryValidateAst,
  AstValidationError,
  walkBlocks,
  collectBlankIds,
  assignIds,
  lintReferences,
} from "./ast-utils";

const sample: StructuredContent = {
  version: 1,
  defaultWritingMode: "horizontal",
  defaultLang: "ja-modern",
  body: [
    {
      kind: "section",
      number: "第1問",
      children: [
        {
          kind: "passage",
          vertical: false,
          lang: "ja-modern",
          children: [
            {
              kind: "paragraph",
              children: [
                {
                  kind: "underline",
                  marker: "ア",
                  children: [{ kind: "text", value: "下線部" }],
                },
                { kind: "text", value: "について述べよ。" },
                { kind: "ref", refType: "figure", target: "図1-1" },
              ],
            },
            {
              kind: "figure",
              assetId: "asset-fig-1",
              label: "図1-1",
              caption: [{ kind: "text", value: "実験装置" }],
            },
            {
              kind: "footnote_section",
              items: [
                {
                  ref: "○",
                  children: [{ kind: "text", value: "脚注内容" }],
                },
              ],
            },
          ],
        },
        {
          kind: "question_group",
          numbering: "kakko-kanji",
          children: [
            {
              id: "q-initial",
              number: "(一)",
              prompt: [
                {
                  kind: "paragraph",
                  children: [{ kind: "text", value: "答えよ。" }],
                },
              ],
              answerType: "essay",
              blanks: [{ id: "blk-initial" }],
            },
          ],
        },
      ],
    },
  ],
};

describe("validateAst", () => {
  it("returns parsed content for valid input", () => {
    const result = validateAst(sample);
    expect(result.version).toBe(1);
  });

  it("throws AstValidationError for malformed input", () => {
    expect(() => validateAst({ version: 1 })).toThrow(AstValidationError);
  });

  it("captures issue path/message", () => {
    try {
      validateAst({ version: 1, body: "not-an-array" });
    } catch (e) {
      expect(e).toBeInstanceOf(AstValidationError);
      const err = e as AstValidationError;
      expect(err.issues.length).toBeGreaterThan(0);
      expect(err.issues[0]?.path).toBeDefined();
    }
  });
});

describe("tryValidateAst", () => {
  it("returns ok=true on success", () => {
    const r = tryValidateAst(sample);
    expect(r.ok).toBe(true);
  });
  it("returns ok=false on failure", () => {
    const r = tryValidateAst({ bogus: true });
    expect(r.ok).toBe(false);
  });
});

describe("walkBlocks", () => {
  it("walks block tree in pre-order", () => {
    const visited: string[] = [];
    for (const { node } of walkBlocks(sample.body)) {
      visited.push(node.kind);
    }
    expect(visited[0]).toBe("section");
    expect(visited).toContain("passage");
    expect(visited).toContain("paragraph");
    expect(visited).toContain("question_group");
    expect(visited).toContain("figure");
  });
});

describe("assignIds", () => {
  it("assigns ids to questions and blanks that lack them", () => {
    // Use unsafe cast to feed empty ids; assignIds is the function under test
    // that should populate them.
    const ast = {
      ...sample,
      body: [
        {
          kind: "question_group" as const,
          numbering: "kakko-kanji" as const,
          children: [
            {
              id: "",
              number: "(一)",
              prompt: [],
              answerType: "essay" as const,
              blanks: [{ id: "" }],
            },
          ],
        },
      ],
    } as unknown as StructuredContent;
    const fixed = assignIds(ast);
    const qg = fixed.body[0];
    if (qg?.kind !== "question_group") throw new Error("expected qg");
    const q = qg.children[0]!;
    expect(q.id).toBeTruthy();
    expect(q.blanks?.[0]?.id).toBeTruthy();
  });

  it("preserves existing non-empty ids", () => {
    const ast: StructuredContent = {
      ...sample,
      body: [
        {
          kind: "question_group",
          numbering: "kakko-kanji",
          children: [
            {
              id: "preserve-me",
              number: "1",
              prompt: [],
              answerType: "essay",
            },
          ],
        },
      ],
    };
    const fixed = assignIds(ast);
    const qg = fixed.body[0]!;
    if (qg.kind !== "question_group") throw new Error("expected qg");
    expect(qg.children[0]!.id).toBe("preserve-me");
  });
});

describe("collectBlankIds", () => {
  it("collects blanks defined inline", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "horizontal",
      defaultLang: "ja-modern",
      body: [
        {
          kind: "paragraph",
          children: [{ kind: "blank", id: "b1", label: "ア" }],
        },
      ],
    };
    expect(collectBlankIds(ast.body)).toEqual(["b1"]);
  });

  it("collects blanks from question.blanks array", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "horizontal",
      defaultLang: "ja-modern",
      body: [
        {
          kind: "question_group",
          numbering: "kakko-kanji",
          children: [
            {
              id: "q1",
              number: "1",
              prompt: [],
              answerType: "fill_blank",
              blanks: [{ id: "blk-1" }, { id: "blk-2" }],
            },
          ],
        },
      ],
    };
    expect(collectBlankIds(ast.body).sort()).toEqual(["blk-1", "blk-2"]);
  });
});

describe("lintReferences", () => {
  it("returns empty warnings when refs resolve", () => {
    const fixed = assignIds(sample);
    const warnings = lintReferences(fixed);
    expect(warnings).toEqual([]);
  });

  it("flags unresolved figure refs", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "horizontal",
      defaultLang: "ja-modern",
      body: [
        {
          kind: "paragraph",
          children: [{ kind: "ref", refType: "figure", target: "図99-99" }],
        },
      ],
    };
    const warnings = lintReferences(ast);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("図99-99");
  });
});
