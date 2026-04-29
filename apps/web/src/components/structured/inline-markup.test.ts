// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  inlineNodesToMarkup,
  parseInlineMarkup,
} from "./inline-markup";
import type { InlineNode } from "@toinoma/shared/schemas";

describe("inline markup parser", () => {
  it("round-trips plain text", () => {
    const nodes: InlineNode[] = [{ kind: "text", value: "hello" }];
    expect(inlineNodesToMarkup(nodes)).toBe("hello");
    expect(parseInlineMarkup("hello")).toEqual([
      { kind: "text", value: "hello" },
    ]);
  });

  it("encodes ruby tokens", () => {
    const nodes: InlineNode[] = [{ kind: "ruby", base: "漢字", reading: "かんじ" }];
    expect(inlineNodesToMarkup(nodes)).toBe("{ruby:漢字|かんじ}");
  });

  it("decodes ruby tokens", () => {
    const parsed = parseInlineMarkup("{ruby:狭衣|さごろも}");
    expect(parsed).toEqual([
      { kind: "ruby", base: "狭衣", reading: "さごろも" },
    ]);
  });

  it("decodes underline with marker", () => {
    const parsed = parseInlineMarkup("{underline:ア|本文}");
    expect(parsed[0]?.kind).toBe("underline");
    if (parsed[0]?.kind === "underline") {
      expect(parsed[0].marker).toBe("ア");
      expect(parsed[0].children).toEqual([{ kind: "text", value: "本文" }]);
    }
  });

  it("decodes math inline", () => {
    const parsed = parseInlineMarkup("{math:x^2 + y^2}");
    expect(parsed).toEqual([{ kind: "math_inline", latex: "x^2 + y^2" }]);
  });

  it("decodes blank with id and label", () => {
    const parsed = parseInlineMarkup("{blank:b1|ア}");
    expect(parsed).toEqual([{ kind: "blank", id: "b1", label: "ア" }]);
  });

  it("interleaves text and tokens", () => {
    const parsed = parseInlineMarkup("hello {ruby:漢|かん} world");
    expect(parsed).toHaveLength(3);
    expect(parsed[0]?.kind).toBe("text");
    expect(parsed[1]?.kind).toBe("ruby");
    expect(parsed[2]?.kind).toBe("text");
  });

  it("preserves unknown tokens as text", () => {
    const parsed = parseInlineMarkup("{xxx:abc}");
    expect(parsed[0]?.kind).toBe("text");
  });

  it("encodes nested kakko + underline + ruby", () => {
    const nodes: InlineNode[] = [
      {
        kind: "kakko",
        style: "「」",
        children: [
          {
            kind: "underline",
            marker: "イ",
            children: [{ kind: "ruby", base: "他者", reading: "たしゃ" }],
          },
        ],
      },
    ];
    const text = inlineNodesToMarkup(nodes);
    expect(text).toContain("kakko");
    expect(text).toContain("underline");
    expect(text).toContain("ruby");
  });
});
