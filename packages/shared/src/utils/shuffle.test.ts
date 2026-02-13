import { describe, it, expect } from "vitest";
import { shuffleArray } from "./shuffle";

describe("shuffleArray", () => {
  it("returns array of same length", () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(input.length);
  });

  it("does NOT mutate original array", () => {
    const input = [1, 2, 3, 4, 5];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  it("returns empty array for empty input", () => {
    const result = shuffleArray([]);
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it("returns single-element array unchanged", () => {
    const result = shuffleArray([42]);
    expect(result).toEqual([42]);
  });

  it("contains all original elements (no duplicates, no missing)", () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = shuffleArray(input);
    expect(result.sort((a, b) => a - b)).toEqual(
      input.sort((a, b) => a - b)
    );
  });
});
