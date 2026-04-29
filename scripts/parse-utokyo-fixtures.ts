/**
 * Offline parser for fixtures/utokyo-2026/<slug>/problem.pdf.
 *
 * Walks each subject folder in the fixtures directory, calls the structured-
 * content parser, validates the output, and writes it to
 * scripts/seed/data/structured/<slug>.json.
 *
 * Run with:
 *   pnpm seed:utokyo:parse              # parse every subject (re-parses all)
 *   pnpm seed:utokyo:parse -- --only=english
 *   pnpm seed:utokyo:parse -- --skip-existing
 *   pnpm seed:utokyo:parse -- --dry-run
 *
 * Cost note: each invocation calls Gemini 2.5 Pro with a multi-page PDF.
 * Use --skip-existing to avoid re-parsing subjects whose JSON already exists.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import {
  parseToStructuredContent,
  ParserError,
} from "../apps/web/src/lib/parser/parser";
import {
  structuredContentSchema,
  type StructuredContent,
} from "@toinoma/shared/schemas";
import type { Subject } from "@toinoma/shared/types";
import { MANIFEST } from "./seed/data/manifest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const FIXTURES_ROOT = join(REPO_ROOT, "fixtures", "utokyo-2026");
const OUT_DIR = join(__dirname, "seed", "data", "structured");

interface CliFlags {
  onlySubject: string | null;
  skipExisting: boolean;
  dryRun: boolean;
}

function parseFlags(argv: readonly string[]): CliFlags {
  const flags: CliFlags = {
    onlySubject: null,
    skipExisting: false,
    dryRun: false,
  };
  for (const arg of argv) {
    if (arg === "--skip-existing") flags.skipExisting = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg.startsWith("--only=")) flags.onlySubject = arg.slice("--only=".length);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return flags;
}

function printHelp(): void {
  console.log(`Usage: pnpm seed:utokyo:parse [-- options]

Options:
  --only=<slug>       Parse only the given subject slug (e.g. english)
  --skip-existing     Skip subjects whose JSON output already exists
  --dry-run           Plan only — do not invoke the API or write files
  --help              Show this message
`);
}

function loadEnv(): void {
  // The parser uses GOOGLE_GENERATIVE_AI_API_KEY via @ai-sdk/google.
  for (const candidate of [".env.local", ".env"]) {
    const envFile = join(REPO_ROOT, "apps", "web", candidate);
    if (existsSync(envFile)) {
      loadDotenv({ path: envFile, override: false });
    }
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set. Add it to apps/web/.env.local or export it.",
    );
    process.exit(2);
  }
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const flags = parseFlags(process.argv.slice(2));
  if (!flags.dryRun) {
    loadEnv();
  }

  if (!existsSync(FIXTURES_ROOT)) {
    console.error(`Fixtures directory missing: ${FIXTURES_ROOT}`);
    process.exit(1);
  }
  if (!flags.dryRun) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  const targets = MANIFEST.filter((m) =>
    flags.onlySubject ? m.subjectSlug === flags.onlySubject : true,
  );
  if (targets.length === 0) {
    console.error(`No manifest entries match --only=${flags.onlySubject}`);
    process.exit(1);
  }

  let parsed = 0;
  let skipped = 0;
  let failed = 0;
  const failures: { slug: string; reason: string }[] = [];

  for (const set of targets) {
    const pdf = join(FIXTURES_ROOT, set.subjectSlug, "problem.pdf");
    const out = join(OUT_DIR, `${set.subjectSlug}.json`);
    const exists = existsSync(out);

    if (!existsSync(pdf)) {
      failures.push({ slug: set.subjectSlug, reason: `problem.pdf not found at ${pdf}` });
      failed += 1;
      continue;
    }

    if (flags.skipExisting && exists) {
      console.log(`[skip] ${set.subjectSlug} (existing AST at ${out})`);
      skipped += 1;
      continue;
    }

    if (flags.dryRun) {
      console.log(
        `[dry-run] would parse ${pdf} → ${out} (subject=${set.dbSubject}, mode=${set.writingMode})`,
      );
      continue;
    }

    console.log(`[parse] ${set.subjectSlug}: ${pdf}`);
    try {
      const data = new Uint8Array(readFileSync(pdf));
      const result = await parseToStructuredContent(
        { kind: "pdf", data, filename: `${set.subjectSlug}.pdf` },
        {
          subject: set.dbSubject as Subject,
          university: "東京大学",
          year: 2026,
          hint: `defaultWritingMode=${set.writingMode}, defaultLang=${set.defaultLang}.`,
        },
      );

      // Force the manifest's writing/lang preset; the model occasionally guesses wrong.
      const ast: StructuredContent = {
        ...result.ast,
        defaultWritingMode: set.writingMode,
        defaultLang: set.defaultLang,
        subject: set.dbSubject,
        university: "東京大学",
        year: 2026,
      };
      const validated = structuredContentSchema.safeParse(ast);
      if (!validated.success) {
        const summary = validated.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        throw new Error(`Validation failed: ${summary}`);
      }

      writeFileSync(out, JSON.stringify(validated.data, null, 2) + "\n", "utf8");
      parsed += 1;
      console.log(
        `[ok] ${set.subjectSlug}: ${validated.data.body.length} blocks, ${result.warnings.length} warnings, ${result.rawDurationMs}ms`,
      );
      for (const w of result.warnings.slice(0, 5)) {
        console.log(`  ⚠ ${w}`);
      }
    } catch (err) {
      const reason =
        err instanceof ParserError
          ? `${err.code}: ${err.message}`
          : err instanceof Error
            ? err.message
            : String(err);
      console.error(`[fail] ${set.subjectSlug}: ${reason}`);
      failures.push({ slug: set.subjectSlug, reason });
      failed += 1;
    }
  }

  const elapsedMs = Date.now() - startedAt;
  console.log("");
  console.log(
    `parse summary: parsed=${parsed}, skipped=${skipped}, failed=${failed}, elapsed=${(elapsedMs / 1000).toFixed(1)}s`,
  );
  if (failures.length > 0) {
    console.log("");
    console.log("failures:");
    for (const f of failures) console.log(`  · ${f.slug}: ${f.reason}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
