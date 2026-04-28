import { join } from "node:path";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  loadEnv,
  createSeedAdminClient,
  SeedEnvError,
  detectSchemaCapabilities,
  type SchemaCapabilities,
} from "./seed/env";
import { log, progress, fail } from "./seed/logger";
import {
  ensureBucketExists,
  PROBLEM_PDFS_BUCKET,
  uploadPdfIdempotent,
  deleteAllSellerObjects,
} from "./seed/storage";
import {
  TEST_SELLER,
  ensureTestSeller,
  resetTestSellerSubtree,
  deleteSeedSellerAuth,
} from "./seed/seller";
import { ensureQuestionsForSubject, type QuestionOutcome } from "./seed/questions";
import { ensureProblemSet, type ProblemSetOutcome } from "./seed/problem-sets";
import { verifySeed } from "./seed/verify";
import { printBanner } from "./seed/banner";
import { MANIFEST, validateManifest, summarizeManifest } from "./seed/data/manifest";

interface CliFlags {
  dryRun: boolean;
  onlySubject: string | null;
  skipStorage: boolean;
  reset: boolean;
  allowRemote: boolean;
  validateOnly: boolean;
  yes: boolean;
}

function parseFlags(argv: readonly string[]): CliFlags {
  const flags: CliFlags = {
    dryRun: false,
    onlySubject: null,
    skipStorage: false,
    reset: false,
    allowRemote: false,
    validateOnly: false,
    yes: false,
  };
  for (const arg of argv) {
    if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--skip-storage") flags.skipStorage = true;
    else if (arg === "--reset") flags.reset = true;
    else if (arg === "--allow-remote") flags.allowRemote = true;
    else if (arg === "--validate-only") flags.validateOnly = true;
    else if (arg === "--yes" || arg === "-y") flags.yes = true;
    else if (arg.startsWith("--only=")) flags.onlySubject = arg.slice("--only=".length);
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      fail({
        phase: "cli",
        reason: `Unknown flag: ${arg}`,
        fix: "Run with --help to see available flags.",
      });
    }
  }
  return flags;
}

function printHelp(): void {
  console.log(
    [
      "Usage: tsx scripts/seed-utokyo-2026.ts [options]",
      "",
      "Options:",
      "  --dry-run         Validate manifest, probe schema, plan operations, no writes",
      "  --validate-only   Run rubric Zod + title-length checks only",
      "  --only=<slug>     Seed only one subject (e.g., --only=math_sciences)",
      "  --skip-storage    Skip PDF uploads (assume already in bucket)",
      "  --reset           Delete seed seller's full subtree before reseeding (auth + storage + DB rows)",
      "  --allow-remote    Permit non-localhost SUPABASE_URL (requires interactive confirmation)",
      "  --yes, -y         Skip confirmation prompts (CI-friendly; assumes you understand the risks)",
      "  --help, -h        Show this help",
    ].join("\n")
  );
}

async function confirmRemoteRun(env: { supabaseUrl: string }): Promise<void> {
  const rl = createInterface({ input, output });
  console.log("");
  console.log("┌──────────────────────────────────────────────────────────────────┐");
  console.log("│  WARNING: --allow-remote will write to a non-localhost Supabase. │");
  console.log("│  This seed publishes answer.pdf as PUBLICLY readable storage.    │");
  console.log("│  Do NOT run this on a production project.                        │");
  console.log("└──────────────────────────────────────────────────────────────────┘");
  console.log(`  Target: ${env.supabaseUrl}`);
  console.log("");
  const answer = await rl.question("  Type the project ref to confirm (or `cancel`): ");
  rl.close();

  const ref = new URL(env.supabaseUrl).hostname.split(".")[0];
  if (answer.trim() !== ref) {
    fail({
      phase: "cli",
      reason: `Confirmation mismatch — expected "${ref}", got "${answer.trim()}".`,
      fix: "Re-run and type the project ref exactly, or omit --allow-remote.",
    });
  }
}

async function summarizeDegradedMode(
  capabilities: SchemaCapabilities
): Promise<string[]> {
  const notes: string[] = [];
  if (!capabilities.hasQuestions) notes.push("questions table missing — questions will be SKIPPED");
  if (!capabilities.hasJunction)
    notes.push("problem_set_questions missing — junction will be SKIPPED");
  if (!capabilities.hasNotificationPreferences)
    notes.push("notification_preferences missing — defaults will be SKIPPED");
  const missingCols = ["cover_image_url", "time_limit_minutes", "total_points", "preview_question_ids"]
    .filter((c) => !capabilities.problemSetColumns.has(c));
  if (missingCols.length > 0) {
    notes.push(`problem_sets columns missing: ${missingCols.join(", ")} — those fields will be OMITTED`);
  }
  return notes;
}

async function main(): Promise<void> {
  const startTime = Date.now();
  const flags = parseFlags(process.argv.slice(2));

  log({ phase: "init" }, "validating manifest...");
  try {
    validateManifest();
  } catch (err) {
    fail({
      phase: "init",
      reason: err instanceof Error ? err.message : String(err),
      file: "scripts/seed/data/manifest.ts",
      fix: "Fix the indicated rubric file and re-run with --validate-only.",
    });
  }

  const summary = summarizeManifest();
  log(
    { phase: "init" },
    `manifest OK: ${summary.setCount} sets, ${summary.questionCount} questions, ${summary.totalPoints}pt total ` +
      `(types: essay=${summary.questionTypeCounts.essay}, mark_sheet=${summary.questionTypeCounts.mark_sheet}, fill_in_blank=${summary.questionTypeCounts.fill_in_blank})`
  );

  if (flags.validateOnly) {
    log({ phase: "init" }, "validate-only mode: exiting without writes");
    process.exit(0);
  }

  let env;
  try {
    env = loadEnv({ allowRemote: flags.allowRemote });
  } catch (err) {
    if (err instanceof SeedEnvError) {
      fail({
        phase: "env",
        reason: err.summary,
        detail: err.detail,
        fix: err.fix,
      });
    }
    throw err;
  }

  log(
    { phase: "env" },
    `target: ${env.supabaseUrl} (localhost=${env.isLocalhost}, url-source=${env.urlSource}) env-file=${env.resolvedEnvFile || "none"}`
  );

  if (flags.allowRemote && !env.isLocalhost && !flags.yes) {
    await confirmRemoteRun(env);
  }

  const supabase = createSeedAdminClient(env);

  log({ phase: "schema" }, "probing PostgREST OpenAPI for available tables...");
  const capabilities = await detectSchemaCapabilities(env);
  if (!capabilities.hasCore) {
    fail({
      phase: "schema",
      reason: "missing core tables (profiles, seller_profiles, problem_sets)",
      detail: `missing: ${capabilities.missing.join(", ")}`,
      fix: "Run `supabase db push` to apply migrations.",
    });
  }
  const degradedNotes = await summarizeDegradedMode(capabilities);
  const isDegraded = degradedNotes.length > 0;
  if (isDegraded) {
    log({ phase: "schema" }, `DEGRADED MODE — ${degradedNotes.length} issue(s):`);
    for (const note of degradedNotes) log({ phase: "schema" }, `  · ${note}`);
    log({ phase: "schema" }, "→ run `supabase db push` to apply migrations and re-run for full data");
  } else {
    log({ phase: "schema" }, "all tables present — full mode");
  }

  if (flags.dryRun) {
    log({ phase: "dry-run" }, "would create/upsert the following:");
    log({ phase: "dry-run" }, `  · 1 auth.users + profile + seller_profile (${TEST_SELLER.email})`);
    log(
      { phase: "dry-run" },
      `  · ${capabilities.hasNotificationPreferences ? "1 notification_preferences" : "(skip notification_preferences)"}`
    );
    log({ phase: "dry-run" }, `  · ${MANIFEST.length} problem_sets with full inline rubric`);
    log(
      { phase: "dry-run" },
      `  · ${capabilities.hasQuestions ? `${summary.questionCount} questions` : "(skip questions)"}`
    );
    log(
      { phase: "dry-run" },
      `  · ${capabilities.hasJunction ? `${summary.questionCount} problem_set_questions junction rows` : "(skip junction)"}`
    );
    log({ phase: "dry-run" }, `  · ${MANIFEST.length * 3} PDFs to ${PROBLEM_PDFS_BUCKET}`);
    log({ phase: "dry-run" }, "exiting without writes");
    process.exit(0);
  }

  await ensureBucketExists(supabase, PROBLEM_PDFS_BUCKET);

  if (flags.reset) {
    log({ phase: "reset" }, "performing complete reset (auth + storage + DB rows)...");
    // Find the seller first to scope deletes correctly.
    const { data: probe } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = probe.users?.find((u) => u.email === TEST_SELLER.email);
    if (existing) {
      await resetTestSellerSubtree(supabase, existing.id);
      await deleteAllSellerObjects(supabase, PROBLEM_PDFS_BUCKET, existing.id);
      await deleteSeedSellerAuth(supabase, existing.id);
      log({ phase: "reset" }, "complete — re-running ensureTestSeller will re-create everything");
    } else {
      log({ phase: "reset" }, "no existing seed seller found — nothing to reset");
    }
  }

  const sellerResult = await ensureTestSeller(supabase, TEST_SELLER);
  log(
    { phase: "seller" },
    `seller ready: uid=${sellerResult.sellerUserId} (created=${sellerResult.created})`
  );

  const filteredManifest = flags.onlySubject
    ? MANIFEST.filter((s) => s.subjectSlug === flags.onlySubject)
    : MANIFEST;

  if (filteredManifest.length === 0) {
    fail({
      phase: "manifest",
      reason: `--only=${flags.onlySubject} matched zero subjects`,
      fix: `Available slugs: ${MANIFEST.map((s) => s.subjectSlug).join(", ")}`,
    });
  }

  const problemSetOutcomes: ProblemSetOutcome[] = [];
  let totalPdfBytes = 0;
  let totalUploaded = 0;
  let pdfIndex = 0;
  let totalQuestionsInserted = 0;
  const totalPdfs = filteredManifest.length * 3;

  for (const setSpec of filteredManifest) {
    const subjectFolder = join(env.fixturesRoot, setSpec.subjectSlug);
    if (!existsSync(subjectFolder)) {
      fail({
        phase: "fixtures",
        subject: setSpec.subjectSlug,
        reason: `subject folder missing: ${subjectFolder}`,
        fix: `Place problem.pdf, answer.pdf, analysis.pdf under ${subjectFolder}`,
      });
    }

    let problemUrl = "";
    let solutionUrl = "";

    if (!flags.skipStorage) {
      for (const kind of ["problem", "answer", "analysis"] as const) {
        pdfIndex += 1;
        const localPath = join(subjectFolder, `${kind}.pdf`);
        if (!existsSync(localPath)) {
          fail({
            phase: "storage",
            subject: setSpec.subjectSlug,
            reason: `missing fixture: ${kind}.pdf`,
            fix: `Place ${kind}.pdf at ${localPath}`,
          });
        }
        const objectPath = `${sellerResult.sellerUserId}/utokyo-2026/${setSpec.subjectSlug}/${kind}.pdf`;
        const result = await uploadPdfIdempotent(
          supabase,
          PROBLEM_PDFS_BUCKET,
          objectPath,
          localPath
        );
        totalPdfBytes += result.bytes;
        if (result.uploaded) totalUploaded += 1;
        progress(
          { phase: "storage", subject: setSpec.subjectSlug },
          pdfIndex,
          totalPdfs,
          `${kind}.pdf ${result.uploaded ? "UPLOADED" : "EXISTS"} ${(result.bytes / 1024).toFixed(0)}KB`
        );
        if (kind === "problem") problemUrl = result.publicUrl;
        if (kind === "answer") solutionUrl = result.publicUrl;
      }
    } else {
      problemUrl = supabase.storage
        .from(PROBLEM_PDFS_BUCKET)
        .getPublicUrl(
          `${sellerResult.sellerUserId}/utokyo-2026/${setSpec.subjectSlug}/problem.pdf`
        ).data.publicUrl;
      solutionUrl = supabase.storage
        .from(PROBLEM_PDFS_BUCKET)
        .getPublicUrl(
          `${sellerResult.sellerUserId}/utokyo-2026/${setSpec.subjectSlug}/answer.pdf`
        ).data.publicUrl;
    }

    const questionOutcomes: QuestionOutcome[] = await ensureQuestionsForSubject(
      supabase,
      sellerResult.sellerUserId,
      setSpec.subjectSlug,
      setSpec.dbSubject,
      [...setSpec.questions],
      capabilities.hasQuestions
    );
    totalQuestionsInserted += questionOutcomes.length;

    const setOutcome = await ensureProblemSet({
      supabase,
      sellerId: sellerResult.sellerUserId,
      spec: setSpec,
      problemPdfUrl: problemUrl,
      solutionPdfUrl: solutionUrl,
      questions: questionOutcomes,
      hasJunction: capabilities.hasJunction,
      availableColumns: capabilities.problemSetColumns,
    });
    problemSetOutcomes.push(setOutcome);
  }

  log({ phase: "summary" }, `uploads: ${totalUploaded}/${totalPdfs} new, ${formatBytes(totalPdfBytes)} total`);

  if (!flags.onlySubject) {
    const verify = await verifySeed(supabase, sellerResult.sellerUserId, MANIFEST.length);
    if (!verify.passes) {
      fail({
        phase: "verify",
        reason: "post-seed verification failed",
        detail: verify.notes.join("; "),
        fix: "Inspect notes above; the seeded data does not match the app's expected query shape.",
      });
    }
  } else {
    log(
      { phase: "verify" },
      `--only=${flags.onlySubject}: skipping global verify; sanity-check the single set manually`
    );
  }

  printBanner({
    sellerEmail: TEST_SELLER.email,
    sellerUid: sellerResult.sellerUserId,
    problemSets: problemSetOutcomes,
    questionsActuallyInserted: totalQuestionsInserted,
    totalPdfBytes,
    elapsedMs: Date.now() - startTime,
    degraded: isDegraded,
    missingTables: capabilities.missing,
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

main().catch((err) => {
  fail({
    phase: "main",
    reason: err instanceof Error ? err.message : String(err),
    detail: err instanceof Error && err.stack ? err.stack.split("\n").slice(0, 5).join(" | ") : undefined,
    fix: "Check the error context above. For idempotency issues, run with --reset.",
  });
});
