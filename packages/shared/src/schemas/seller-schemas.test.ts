import { describe, it, expect } from "vitest";
import { tosAcceptanceSchema, sellerProfileSchema } from "./seller-schemas";

describe("tosAcceptanceSchema", () => {
  it("accepts when accepted is true", () => {
    const result = tosAcceptanceSchema.safeParse({ accepted: true });
    expect(result.success).toBe(true);
  });

  it("rejects when accepted is false", () => {
    const result = tosAcceptanceSchema.safeParse({ accepted: false });
    expect(result.success).toBe(false);
  });

  it("rejects when accepted is missing", () => {
    const result = tosAcceptanceSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects non-boolean values", () => {
    const result = tosAcceptanceSchema.safeParse({ accepted: "true" });
    expect(result.success).toBe(false);
  });
});

describe("sellerProfileSchema", () => {
  it("accepts valid profile with all fields", () => {
    const result = sellerProfileSchema.safeParse({
      sellerDisplayName: "東大理系サークル",
      sellerDescription: "物理と数学の問題を作成しています。",
      university: "東京大学",
      circleName: "問題研究会",
    });
    expect(result.success).toBe(true);
  });

  it("accepts profile with only required display name", () => {
    const result = sellerProfileSchema.safeParse({
      sellerDisplayName: "Test Seller",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty display name", () => {
    const result = sellerProfileSchema.safeParse({
      sellerDisplayName: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("表示名は必須です");
    }
  });

  it("rejects missing display name", () => {
    const result = sellerProfileSchema.safeParse({
      university: "東京大学",
    });
    expect(result.success).toBe(false);
  });

  it("rejects display name exceeding 50 characters", () => {
    const result = sellerProfileSchema.safeParse({
      sellerDisplayName: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description exceeding 500 characters", () => {
    const result = sellerProfileSchema.safeParse({
      sellerDisplayName: "Valid Name",
      sellerDescription: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects university name exceeding 100 characters", () => {
    const result = sellerProfileSchema.safeParse({
      sellerDisplayName: "Valid Name",
      university: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects circle name exceeding 100 characters", () => {
    const result = sellerProfileSchema.safeParse({
      sellerDisplayName: "Valid Name",
      circleName: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("defaults optional fields to empty string", () => {
    const result = sellerProfileSchema.safeParse({
      sellerDisplayName: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sellerDescription).toBe("");
      expect(result.data.university).toBe("");
      expect(result.data.circleName).toBe("");
    }
  });
});
