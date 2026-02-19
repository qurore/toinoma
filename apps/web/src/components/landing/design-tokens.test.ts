// @vitest-environment node
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const navbarSource = readFileSync(
  resolve(__dirname, "./navbar.tsx"),
  "utf-8"
);

const heroSource = readFileSync(
  resolve(__dirname, "./hero-section.tsx"),
  "utf-8"
);

const ctaSource = readFileSync(
  resolve(__dirname, "./cta-section.tsx"),
  "utf-8"
);

const globalsCss = readFileSync(
  resolve(__dirname, "../../app/globals.css"),
  "utf-8"
);

describe("globals.css color tokens", () => {
  it("primary is wakaba green hsl(142 71% 38%)", () => {
    expect(globalsCss).toContain("--color-primary: hsl(142 71% 38%)");
  });

  it("ring matches primary (wakaba green)", () => {
    expect(globalsCss).toContain("--color-ring: hsl(142 71% 38%)");
  });

  it("forest token replaces navy", () => {
    expect(globalsCss).toContain("--color-forest: hsl(152 40% 14%)");
    expect(globalsCss).not.toContain("--color-navy:");
  });

  it("green tokens replace teal tokens", () => {
    expect(globalsCss).toContain("--color-green:");
    expect(globalsCss).toContain("--color-green-light:");
    expect(globalsCss).toContain("--color-green-glow:");
    expect(globalsCss).not.toContain("--color-teal:");
  });

  it("hero gradient uses forest green hues", () => {
    expect(globalsCss).toContain("hsl(152 40% 14%)");
    // Old navy hue must not appear in gradient-hero
    expect(globalsCss).not.toContain("hsl(230 40% 12%)");
    expect(globalsCss).not.toContain("hsl(235 45% 22%)");
  });

  it("shadow-green replaces shadow-teal", () => {
    expect(globalsCss).toContain("--shadow-green:");
    expect(globalsCss).not.toContain("--shadow-teal:");
  });

  it("pulse-glow keyframe uses green hue", () => {
    expect(globalsCss).toContain("hsl(142 71% 38% / 0.15)");
    expect(globalsCss).not.toContain("hsl(174 72% 44% / 0.15)");
  });

  it("text-gradient-green utility class exists", () => {
    expect(globalsCss).toContain(".text-gradient-green");
    expect(globalsCss).not.toContain(".text-gradient-teal");
  });

  it("shadow-green utility class exists", () => {
    expect(globalsCss).toContain(".shadow-green");
    expect(globalsCss).not.toContain(".shadow-teal {");
  });
});

describe("Navbar component", () => {
  it("uses bg-forest/80 not bg-navy/80", () => {
    expect(navbarSource).toContain("bg-forest/80");
    expect(navbarSource).not.toContain("bg-navy");
  });

  it("uses text-green for logo icon, not text-teal", () => {
    expect(navbarSource).toContain("text-green");
    expect(navbarSource).not.toContain("text-teal");
  });
});

describe("HeroSection component", () => {
  it("uses green glow div, not teal", () => {
    expect(heroSource).toContain("bg-green/10");
    expect(heroSource).not.toContain("bg-teal/10");
  });

  it("badge uses green border and text, not teal", () => {
    expect(heroSource).toContain("border-green/30");
    expect(heroSource).toContain("text-green-light");
    expect(heroSource).not.toContain("border-teal");
    expect(heroSource).not.toContain("text-teal");
  });

  it("title uses text-gradient-green, not text-gradient-teal", () => {
    expect(heroSource).toContain("text-gradient-green");
    expect(heroSource).not.toContain("text-gradient-teal");
  });

  it("stats use text-green-glow, not text-teal-glow", () => {
    expect(heroSource).toContain("text-green-glow");
    expect(heroSource).not.toContain("text-teal-glow");
  });
});

describe("CTASection component", () => {
  it("uses bg-green/20 for glow effect, not bg-teal/20", () => {
    expect(ctaSource).toContain("bg-green/20");
    expect(ctaSource).not.toContain("bg-teal/20");
  });
});
