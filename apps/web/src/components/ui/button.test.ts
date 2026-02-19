// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const buttonSource = readFileSync(resolve(__dirname, "./button.tsx"), "utf-8");

describe("Button component design tokens", () => {
  it("hero variant uses shadow-green, not shadow-teal", () => {
    expect(buttonSource).toContain("shadow-green");
    expect(buttonSource).not.toContain("shadow-teal");
  });

  it("default variant uses semantic token classes only", () => {
    expect(buttonSource).toContain("bg-primary");
    expect(buttonSource).toContain("text-primary-foreground");
  });

  it("contains no hardcoded color values", () => {
    expect(buttonSource).not.toMatch(/hsl\(/);
    expect(buttonSource).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });
});
