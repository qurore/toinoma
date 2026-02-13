import { describe, it, expect } from "vitest";
import {
  essayAnswerSchema,
  markSheetAnswerSchema,
  fillInBlankAnswerSchema,
  questionAnswerSchema,
} from "./answer-schemas";

describe("essayAnswerSchema", () => {
  it("accepts answer with text only", () => {
    const result = essayAnswerSchema.safeParse({
      type: "essay",
      text: "The Treaty of Westphalia established...",
    });
    expect(result.success).toBe(true);
  });

  it("accepts answer with imageUrl only", () => {
    const result = essayAnswerSchema.safeParse({
      type: "essay",
      imageUrl: "https://example.com/answer.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("accepts answer with both text and imageUrl", () => {
    const result = essayAnswerSchema.safeParse({
      type: "essay",
      text: "My answer",
      imageUrl: "https://example.com/answer.jpg",
    });
    expect(result.success).toBe(true);
  });

  it("rejects answer with neither text nor imageUrl", () => {
    const result = essayAnswerSchema.safeParse({ type: "essay" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid imageUrl", () => {
    const result = essayAnswerSchema.safeParse({
      type: "essay",
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("markSheetAnswerSchema", () => {
  it("accepts valid selection", () => {
    const result = markSheetAnswerSchema.safeParse({
      type: "mark_sheet",
      selected: "A",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty selection", () => {
    const result = markSheetAnswerSchema.safeParse({
      type: "mark_sheet",
      selected: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing selected field", () => {
    const result = markSheetAnswerSchema.safeParse({
      type: "mark_sheet",
    });
    expect(result.success).toBe(false);
  });
});

describe("fillInBlankAnswerSchema", () => {
  it("accepts valid text", () => {
    const result = fillInBlankAnswerSchema.safeParse({
      type: "fill_in_blank",
      text: "Tokyo",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing text field", () => {
    const result = fillInBlankAnswerSchema.safeParse({
      type: "fill_in_blank",
    });
    expect(result.success).toBe(false);
  });
});

describe("questionAnswerSchema (discriminated union)", () => {
  it("dispatches to essay schema", () => {
    const result = questionAnswerSchema.safeParse({
      type: "essay",
      text: "My essay answer",
    });
    expect(result.success).toBe(true);
  });

  it("dispatches to mark_sheet schema", () => {
    const result = questionAnswerSchema.safeParse({
      type: "mark_sheet",
      selected: "B",
    });
    expect(result.success).toBe(true);
  });

  it("dispatches to fill_in_blank schema", () => {
    const result = questionAnswerSchema.safeParse({
      type: "fill_in_blank",
      text: "42",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown type", () => {
    const result = questionAnswerSchema.safeParse({
      type: "unknown_type",
      text: "Something",
    });
    expect(result.success).toBe(false);
  });
});
