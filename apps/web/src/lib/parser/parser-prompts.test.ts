// @vitest-environment node
import { describe, it, expect } from "vitest";
import { buildParserSystemPrompt } from "./parser-prompts";

describe("buildParserSystemPrompt", () => {
  it("returns the base prompt when no subject is given", () => {
    const p = buildParserSystemPrompt();
    expect(p).toContain("StructuredContent AST");
    expect(p).toContain("KANBUN RULES");
    expect(p).toContain("CORE RULES");
  });

  it("appends Japanese genre extension for `japanese`", () => {
    const p = buildParserSystemPrompt("japanese");
    expect(p).toContain("vertical writing");
    expect(p).toContain("kanbun");
    expect(p).toContain("kakko-kanji");
  });

  it("appends math genre extension for `math`", () => {
    const p = buildParserSystemPrompt("math");
    expect(p).toContain("Mathematics");
    expect(p).toContain("LaTeX");
  });

  it("appends english genre extension for `english`", () => {
    const p = buildParserSystemPrompt("english");
    expect(p).toContain("Listening");
    expect(p).toContain('"audio" blocks');
  });

  it("appends physics genre extension", () => {
    const p = buildParserSystemPrompt("physics");
    expect(p).toContain("Physics");
    expect(p).toContain("figure");
  });

  it("appends biology genre extension", () => {
    const p = buildParserSystemPrompt("biology");
    expect(p).toContain("Biology");
    expect(p).toContain("tables");
  });

  it("falls back to base prompt for unsupported subject", () => {
    const p = buildParserSystemPrompt("japanese_history");
    expect(p).toContain("StructuredContent AST");
    expect(p).toContain("Japanese History");
  });
});
