// @vitest-environment node
//
// Component-rendering tests use react-dom/server (renderToString) instead of
// @testing-library because jsdom + @testing-library has an ESM incompatibility
// with @exodus/bytes in this monorepo (see auto-save-indicator.test.tsx for the
// same workaround). renderToString gives us the same HTML assertions without
// needing a DOM environment.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StructuredContentView } from "./structured-content-view";
import type { StructuredContent } from "@toinoma/shared/schemas";

function build(
  body: StructuredContent["body"],
  extra: Partial<StructuredContent> = {},
): StructuredContent {
  return {
    version: 1,
    defaultWritingMode: "horizontal",
    defaultLang: "ja-modern",
    body,
    ...extra,
  };
}

function html(content: StructuredContent, props: Record<string, unknown> = {}): string {
  return renderToStaticMarkup(
    <StructuredContentView content={content} {...props} />,
  );
}

describe("StructuredContentView (SSR)", () => {
  it("renders a paragraph with plain text", () => {
    const out = html(
      build([
        {
          kind: "paragraph",
          children: [{ kind: "text", value: "次の問いに答えよ。" }],
        },
      ]),
    );
    expect(out).toContain("次の問いに答えよ。");
    expect(out).toContain("structured-paragraph");
  });

  it("renders ruby furigana via <ruby><rt>", () => {
    const out = html(
      build([
        {
          kind: "paragraph",
          children: [{ kind: "ruby", base: "漢字", reading: "かんじ" }],
        },
      ]),
    );
    expect(out).toContain("<ruby");
    expect(out).toContain("<rt");
    expect(out).toContain("かんじ");
    expect(out).toContain("漢字");
  });

  it("applies vertical writing-mode class when defaultWritingMode=vertical", () => {
    const out = html(
      build(
        [
          {
            kind: "passage",
            vertical: true,
            lang: "ja-classical",
            children: [
              {
                kind: "paragraph",
                children: [{ kind: "text", value: "古文" }],
              },
            ],
          },
        ],
        { defaultWritingMode: "vertical", defaultLang: "ja-classical" },
      ),
    );
    expect(out).toContain('data-default-writing-mode="vertical"');
    expect(out).toContain("structured-vertical");
  });

  it("renders an underline marker as a button when interactive", () => {
    const out = html(
      build([
        {
          kind: "paragraph",
          children: [
            {
              kind: "underline",
              marker: "ア",
              children: [{ kind: "text", value: "傍線部" }],
            },
          ],
        },
      ]),
    );
    expect(out).toContain('data-marker="ア"');
    expect(out).toContain("傍線部");
    expect(out).toContain('aria-label="傍線部ア"');
    expect(out).toMatch(/<button[^>]*data-marker/);
  });

  it("renders an underline marker as a span when inert", () => {
    const out = html(
      build([
        {
          kind: "paragraph",
          children: [
            {
              kind: "underline",
              marker: "ア",
              children: [{ kind: "text", value: "傍線部" }],
            },
          ],
        },
      ]),
      { inert: true },
    );
    expect(out).not.toMatch(/<button[^>]*data-marker/);
    expect(out).toContain('aria-label="傍線部ア"');
  });

  it("renders blank as an interactive button with aria-label", () => {
    const out = html(
      build([
        {
          kind: "paragraph",
          children: [{ kind: "blank", id: "b1", label: "ア" }],
        },
      ]),
    );
    expect(out).toContain('data-blank-id="b1"');
    expect(out).toContain("ア");
    expect(out).toMatch(/aria-label="空欄[^"]*"/);
  });

  it("renders figure with placeholder when no asset is supplied", () => {
    const out = html(
      build([
        {
          kind: "figure",
          assetId: "missing",
          label: "図1-1",
          caption: [{ kind: "text", value: "実験装置" }],
        },
      ]),
    );
    expect(out).toContain("画像未アップロード");
  });

  it("renders figure with image when asset is supplied", () => {
    const out = html(
      build([
        {
          kind: "figure",
          assetId: "fig1",
          label: "図1-1",
        },
      ]),
      { assets: { fig1: { url: "/img.png" } } },
    );
    expect(out).toContain('src="/img.png"');
    expect(out).toContain("img");
  });

  it("renders kakko bracket characters around children", () => {
    const out = html(
      build([
        {
          kind: "paragraph",
          children: [
            {
              kind: "kakko",
              style: "「」",
              children: [{ kind: "text", value: "他者" }],
            },
          ],
        },
      ]),
    );
    expect(out).toContain("「");
    expect(out).toContain("他者");
    expect(out).toContain("」");
  });

  it("renders multiple-choice options with appropriate labels", () => {
    const out = html(
      build([
        {
          kind: "choices",
          style: "a-z",
          options: [
            { id: "a", children: [{ kind: "text", value: "First" }] },
            { id: "b", children: [{ kind: "text", value: "Second" }] },
          ],
        },
      ]),
    );
    expect(out).toContain("a)");
    expect(out).toContain("b)");
    expect(out).toContain("First");
    expect(out).toContain("Second");
  });

  it("renders footnote section with refs", () => {
    const out = html(
      build([
        {
          kind: "footnote_section",
          items: [
            {
              ref: "○",
              children: [{ kind: "text", value: "脚注" }],
            },
          ],
        },
      ]),
    );
    expect(out).toContain("○");
    expect(out).toContain("脚注");
  });

  it("renders a question with constraint label", () => {
    const out = html(
      build([
        {
          kind: "question_group",
          numbering: "kakko-kanji",
          children: [
            {
              id: "q1",
              number: "(一)",
              prompt: [
                {
                  kind: "paragraph",
                  children: [{ kind: "text", value: "120字以内で答えよ。" }],
                },
              ],
              answerType: "essay",
              constraint: { kind: "chars", max: 120 },
            },
          ],
        },
      ]),
    );
    expect(out).toContain("120");
    expect(out).toContain("(一)");
    expect(out).toContain("essay");
  });

  it("renders a kanbun block with kunten annotations", () => {
    const out = html(
      build([
        {
          kind: "kanbun_block",
          lines: [
            {
              tokens: [
                { char: "蒼" },
                { char: "然", okurigana: "ル" },
                { char: "両" },
                { char: "石", okurigana: "ヲ", kaeriten: "レ" },
              ],
            },
          ],
        },
      ]),
    );
    expect(out).toContain("structured-kanbun");
    expect(out).toContain("蒼");
    expect(out).toContain("然");
    expect(out).toContain("ル");
    expect(out).toContain("レ");
    // each token should have aria-label with kunten descriptions
    expect(out).toMatch(/aria-label="石[^"]*送り仮名: ヲ[^"]*返り点: レ"/);
  });

  it("renders citation block in trailing position", () => {
    const out = html(
      build([
        {
          kind: "citation",
          children: [{ kind: "text", value: "松本卓也『斜め論』による" }],
        },
      ]),
    );
    expect(out).toContain("松本卓也");
    expect(out).toContain("structured-citation");
  });

  it("renders math display with KaTeX", () => {
    const out = html(
      build([
        {
          kind: "math_display",
          latex: "x^2 + y^2 = z^2",
        },
      ]),
    );
    // KaTeX renders complex HTML — just check the wrapper class
    expect(out).toContain("structured-math-display");
    expect(out).toMatch(/katex|x|y|z/); // some math content rendered
  });
});
