// @vitest-environment node
// FS-only test; opt out of the jsdom default (set in src/test/setup.ts) to keep it cheap.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";

// ──────────────────────────────────────────────
// Regression guard for: ChunkLoadError on /explore (webpack chunk-hash desync).
// DRW resolved 2026-04-28: pin dev bundler to Turbopack for deterministic chunk
// hashing and to avoid webpack HMR runtime races. Reverting `next dev` to the
// webpack default reintroduces the failure — keep `--turbopack` on the script.
// ──────────────────────────────────────────────

describe("apps/web package.json dev script", () => {
  it("invokes next dev with --turbopack", () => {
    const pkgPath = join(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
      scripts: { dev: string };
    };
    expect(pkg.scripts.dev).toContain("--turbopack");
  });
});
