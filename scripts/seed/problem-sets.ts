import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@toinoma/shared/types";
import type { ProblemSetRubric } from "@toinoma/shared/schemas";
import { log } from "./logger";
import type { QuestionOutcome } from "./questions";
import type { ProblemSetSpec } from "./types";
import { loadStructuredContent } from "./structured-content";

export interface ProblemSetOutcome {
  spec: ProblemSetSpec;
  problemSetId: string;
  created: boolean;
  structuredContentSource: "parsed" | "stub" | "skipped";
}

interface BuildArgs {
  supabase: SupabaseClient<Database>;
  sellerId: string;
  spec: ProblemSetSpec;
  problemPdfUrl: string;
  solutionPdfUrl: string;
  /** Internal storage path of the source problem.pdf, e.g. `<uid>/utokyo-2026/<slug>/problem.pdf`. */
  sourcePdfPath: string | null;
  questions: QuestionOutcome[];
  hasJunction: boolean;
  availableColumns: Set<string>;
}

function buildProblemSetRubric(
  spec: ProblemSetSpec,
  questions: QuestionOutcome[]
): ProblemSetRubric {
  return {
    sections: questions.map((q, idx) => ({
      number: idx + 1,
      points: q.spec.points,
      questions: [q.spec.rubric],
    })),
  };
}

function buildDescription(spec: ProblemSetSpec, totalPoints: number): string {
  const questionCount = spec.questions.length;
  return [
    `東京大学 2026年度 前期日程「${spec.title.replace("東京大学 2026 ", "")}」の問題と解答例を収録した過去問セットです。`,
    `全${questionCount}問・配点合計${totalPoints}点・制限時間${spec.timeLimitMinutes}分。`,
    `出題範囲は${spec.descriptionScope}。記述式と一部選択・短答を含み、Toinoma の AI 採点機能を試すサンプルとして整備されています。`,
    "",
    "※本データは動作確認用シードです。著作権は各出題機関に帰属します。",
  ].join("\n");
}

export async function ensureProblemSet(
  args: BuildArgs
): Promise<ProblemSetOutcome> {
  const {
    supabase,
    sellerId,
    spec,
    problemPdfUrl,
    solutionPdfUrl,
    sourcePdfPath,
    questions,
    hasJunction,
    availableColumns,
  } = args;
  // When questions table is missing, fall back to spec.questions for rubric construction.
  const fallbackQuestions: QuestionOutcome[] =
    questions.length > 0
      ? questions
      : spec.questions.map((q) => ({ spec: q, questionId: "", created: false }));
  const totalPoints = fallbackQuestions.reduce((sum, q) => sum + q.spec.points, 0);
  const rubricJson = buildProblemSetRubric(spec, fallbackQuestions);
  const previewIds = questions
    .slice(0, Math.min(2, questions.length))
    .map((q) => q.questionId)
    .filter((id) => id.length > 0);

  const { data: existing, error: queryError } = await supabase
    .from("problem_sets")
    .select("id")
    .eq("seller_id", sellerId)
    .eq("title", spec.title)
    .maybeSingle();

  if (queryError) {
    throw new Error(`Failed to query existing problem_set: ${queryError.message}`);
  }

  const description = buildDescription(spec, totalPoints);

  const basePayload: Record<string, unknown> = {
    seller_id: sellerId,
    title: spec.title,
    description,
    subject: spec.dbSubject,
    university: "東京大学",
    difficulty: spec.difficulty,
    price: 0,
    status: "published",
    problem_pdf_url: problemPdfUrl,
    solution_pdf_url: solutionPdfUrl,
    rubric: rubricJson as unknown as Json,
  };

  const optionalPayload: Record<string, unknown> = {
    cover_image_url: null,
    time_limit_minutes: spec.timeLimitMinutes,
    total_points: totalPoints,
    preview_question_ids: previewIds,
  };

  for (const [key, value] of Object.entries(optionalPayload)) {
    if (availableColumns.has(key)) basePayload[key] = value;
  }

  // Structured-content columns. Tolerate degraded schemas — only set columns that exist.
  let structuredSource: ProblemSetOutcome["structuredContentSource"] = "skipped";
  const hasStructuredCol = availableColumns.has("structured_content");
  const hasContentFormatCol = availableColumns.has("content_format");
  const hasWritingModeCol = availableColumns.has("writing_mode");
  const hasSourcePdfPathCol = availableColumns.has("source_pdf_path");

  if (hasStructuredCol || hasContentFormatCol || hasWritingModeCol || hasSourcePdfPathCol) {
    const loaded = loadStructuredContent(spec);
    structuredSource = loaded.source;

    if (hasStructuredCol) {
      basePayload.structured_content = loaded.ast as unknown as Json;
    }
    if (hasContentFormatCol) {
      basePayload.content_format = "structured";
    }
    if (hasWritingModeCol) {
      basePayload.writing_mode = spec.writingMode;
    }
    if (hasSourcePdfPathCol && sourcePdfPath) {
      basePayload.source_pdf_path = sourcePdfPath;
    }

    log(
      { phase: "problem_sets", subject: spec.subjectSlug },
      `structured_content: ${loaded.source}` +
        (loaded.filePath ? ` (file=${loaded.filePath.replace(/^.*\/data\//, "data/")})` : ""),
    );
  }

  // The seed must tolerate degraded schemas where some Insert columns don't
  // exist in the live DB. We erase the strict Database typing on the table
  // builder for these calls — capability detection upstream guarantees the
  // payload only references columns that actually exist.
  type RawTable = {
    update: (v: Record<string, unknown>) => {
      eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
  const rawTable = supabase.from("problem_sets") as unknown as RawTable;

  const existingId = (existing as { id: string } | null)?.id;

  if (existingId) {
    const { error: updateError } = await rawTable
      .update(basePayload)
      .eq("id", existingId);
    if (updateError) {
      throw new Error(
        `Failed to update problem_set ${existingId}: ${updateError.message}`
      );
    }
    log({ phase: "problem_sets", subject: spec.subjectSlug }, `UPDATED (id=${existingId})`);
    if (hasJunction && questions.length > 0) {
      await ensureProblemSetQuestions(supabase, existingId, questions);
    }
    return {
      spec,
      problemSetId: existingId,
      created: false,
      structuredContentSource: structuredSource,
    };
  }

  const { data: inserted, error: insertError } = await rawTable
    .insert(basePayload)
    .select("id")
    .single();
  if (insertError || !inserted) {
    throw new Error(`Failed to insert problem_set: ${insertError?.message ?? "no row"}`);
  }
  log({ phase: "problem_sets", subject: spec.subjectSlug }, `CREATED (id=${inserted.id})`);
  if (hasJunction && questions.length > 0) {
    await ensureProblemSetQuestions(supabase, inserted.id, questions);
  }
  return {
    spec,
    problemSetId: inserted.id,
    created: true,
    structuredContentSource: structuredSource,
  };
}

async function ensureProblemSetQuestions(
  supabase: SupabaseClient<Database>,
  problemSetId: string,
  questions: QuestionOutcome[]
): Promise<void> {
  const rows = questions.map((q, idx) => ({
    problem_set_id: problemSetId,
    question_id: q.questionId,
    section_number: idx + 1,
    section_title: q.spec.sectionTitle,
    position: 0,
    points_override: null,
  }));

  type RawJunction = {
    upsert: (
      v: Record<string, unknown>[],
      opts: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  };
  const rawJunction = supabase.from("problem_set_questions") as unknown as RawJunction;
  const { error } = await rawJunction.upsert(rows, {
    onConflict: "problem_set_id,question_id",
  });
  if (error) {
    throw new Error(`Failed to upsert problem_set_questions: ${error.message}`);
  }
}
