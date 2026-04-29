import { describe, it, expect } from "vitest";
import {
  structuredContentSchema,
  numberingStyleSchema,
  kanbunLineSchema,
  type StructuredContent,
} from "./structured-content-schemas";

describe("numberingStyleSchema", () => {
  it.each(["kakko-kanji", "kakko-arabic", "A-Z", "a-z", "maru-kanji", "roman-upper"])(
    "accepts %s",
    (style) => {
      expect(numberingStyleSchema.safeParse(style).success).toBe(true);
    },
  );
  it("rejects unknown style", () => {
    expect(numberingStyleSchema.safeParse("greek").success).toBe(false);
  });
});

describe("kanbunLineSchema", () => {
  it("accepts a line of tokens with kunten", () => {
    const result = kanbunLineSchema.safeParse({
      tokens: [
        { char: "蒼" },
        { char: "然", okurigana: "ル" },
        { char: "両" },
        { char: "片", okurigana: "ノ" },
        { char: "石", okurigana: "ヲ" },
        { char: "厥", okurigana: "ノ" },
        { char: "状", okurigana: "" },
        { char: "怪", okurigana: "ニ" },
        { char: "且", okurigana: "ッ" },
        { char: "醜" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty token list", () => {
    expect(kanbunLineSchema.safeParse({ tokens: [] }).success).toBe(false);
  });
});

describe("structuredContentSchema", () => {
  const baseContent: StructuredContent = {
    version: 1,
    defaultWritingMode: "horizontal",
    defaultLang: "ja-modern",
    body: [
      {
        kind: "section",
        number: "第1問",
        children: [
          {
            kind: "instruction",
            children: [{ kind: "text", value: "次の問いに答えよ。" }],
          },
        ],
      },
    ],
  };

  it("accepts a minimal valid AST", () => {
    expect(structuredContentSchema.safeParse(baseContent).success).toBe(true);
  });

  it("rejects unknown block kind", () => {
    const bad = {
      ...baseContent,
      body: [{ kind: "alien", children: [] } as unknown],
    };
    expect(structuredContentSchema.safeParse(bad).success).toBe(false);
  });

  it("accepts a vertical Japanese passage with ruby", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "vertical",
      defaultLang: "ja-classical",
      body: [
        {
          kind: "passage",
          vertical: true,
          lang: "ja-classical",
          children: [
            {
              kind: "paragraph",
              children: [
                { kind: "text", value: "次の文章は" },
                { kind: "ruby", base: "狭衣物語", reading: "さごろもものがたり" },
                { kind: "text", value: "の一節である。" },
              ],
            },
          ],
        },
      ],
    };
    expect(structuredContentSchema.safeParse(ast).success).toBe(true);
  });

  it("accepts a kanbun block", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "vertical",
      defaultLang: "kanbun",
      body: [
        {
          kind: "kanbun_block",
          lines: [
            {
              tokens: [
                { char: "蒼" },
                { char: "然", okurigana: "ル" },
                { char: "両" },
                { char: "片", okurigana: "ノ" },
                { char: "石", okurigana: "ヲ", kaeriten: "レ" },
              ],
            },
          ],
        },
      ],
    };
    expect(structuredContentSchema.safeParse(ast).success).toBe(true);
  });

  it("accepts a math display with confidence", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "horizontal",
      defaultLang: "ja-modern",
      body: [
        {
          kind: "math_display",
          latex: "\\int_0^{2\\pi} \\sin(\\cos x - x) \\, dx",
          confidence: "high",
        },
      ],
    };
    expect(structuredContentSchema.safeParse(ast).success).toBe(true);
  });

  it("accepts an English passage with footnotes and citation", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "horizontal",
      defaultLang: "en",
      body: [
        {
          kind: "passage",
          vertical: false,
          lang: "en",
          source: [{ kind: "text", value: "Adam Phillips, Introduction" }],
          children: [
            {
              kind: "paragraph",
              children: [{ kind: "text", value: "Freud was a writer..." }],
            },
            {
              kind: "footnote_section",
              items: [
                {
                  ref: "Ludwig Binswanger",
                  children: [
                    { kind: "text", value: "スイスの精神医学者(1881-1966)" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(structuredContentSchema.safeParse(ast).success).toBe(true);
  });

  it("accepts a question_group with constraints", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "vertical",
      defaultLang: "ja-modern",
      body: [
        {
          kind: "question_group",
          numbering: "kakko-kanji",
          children: [
            {
              id: "q-1",
              number: "(一)",
              prompt: [
                {
                  kind: "paragraph",
                  children: [
                    {
                      kind: "underline",
                      marker: "ア",
                      children: [{ kind: "text", value: "傍線部" }],
                    },
                    { kind: "text", value: "について説明せよ。" },
                  ],
                },
              ],
              answerType: "essay",
              constraint: { kind: "chars", max: 120 },
            },
          ],
        },
      ],
    };
    expect(structuredContentSchema.safeParse(ast).success).toBe(true);
  });

  it("accepts choices block with options", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "horizontal",
      defaultLang: "en",
      body: [
        {
          kind: "choices",
          style: "a-z",
          options: [
            { id: "a", children: [{ kind: "text", value: "First option" }] },
            { id: "b", children: [{ kind: "text", value: "Second option" }] },
          ],
        },
      ],
    };
    expect(structuredContentSchema.safeParse(ast).success).toBe(true);
  });

  it("rejects empty rearrange tokens", () => {
    const ast = {
      version: 1,
      defaultWritingMode: "horizontal",
      defaultLang: "en",
      body: [{ kind: "rearrange", tokens: [] }],
    };
    expect(structuredContentSchema.safeParse(ast).success).toBe(false);
  });

  it("accepts a deeply nested inline structure", () => {
    const ast: StructuredContent = {
      version: 1,
      defaultWritingMode: "vertical",
      defaultLang: "ja-modern",
      body: [
        {
          kind: "paragraph",
          children: [
            {
              kind: "kakko",
              style: "「」",
              children: [
                {
                  kind: "underline",
                  marker: "イ",
                  children: [
                    {
                      kind: "ruby",
                      base: "他者",
                      reading: "たしゃ",
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(structuredContentSchema.safeParse(ast).success).toBe(true);
  });
});
