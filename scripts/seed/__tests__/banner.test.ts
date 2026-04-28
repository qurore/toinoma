import { describe, it, expect } from "vitest";
import { osc8 } from "../banner";

const ESC = "\u001b";

// BR2 #D2 regression guard: OSC 8 hyperlinks must include the ESC byte.
describe("OSC 8 hyperlink encoding", () => {
  it("starts with ESC ] 8 ; ;", () => {
    const result = osc8("https://example.com", "label");
    expect(result.startsWith(`${ESC}]8;;`)).toBe(true);
  });

  it("contains ESC \\ as the string terminator", () => {
    const result = osc8("https://example.com", "label");
    const stCount = (result.match(new RegExp(`${ESC}\\\\`, "g")) ?? []).length;
    expect(stCount).toBe(2);
  });

  it("includes both URL and label in correct positions", () => {
    const url = "http://localhost:3000/explore";
    const label = "Open explore";
    const result = osc8(url, label);
    expect(result).toBe(`${ESC}]8;;${url}${ESC}\\${label}${ESC}]8;;${ESC}\\`);
  });
});
