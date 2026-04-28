import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@toinoma/shared/types";
import { log } from "./logger";
import type { QuestionSpec } from "./types";

export interface QuestionOutcome {
  spec: QuestionSpec;
  questionId: string;
  created: boolean;
}

const SEED_TAG_PREFIX = "seed:utokyo-2026:";

function naturalKeyTag(subjectSlug: string, ordinal: number): string {
  return `${SEED_TAG_PREFIX}${subjectSlug}:${ordinal}`;
}

export async function ensureQuestionsForSubject(
  supabase: SupabaseClient<Database>,
  sellerId: string,
  subjectSlug: string,
  dbSubject: Database["public"]["Tables"]["questions"]["Row"]["subject"],
  specs: QuestionSpec[],
  available: boolean
): Promise<QuestionOutcome[]> {
  if (!available) {
    log({ phase: "questions", subject: subjectSlug }, "SKIP (table not in schema)");
    return [];
  }
  const outcomes: QuestionOutcome[] = [];

  // Erase strict generic types — schema may diverge from generated types in degraded mode.
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
  const rawTable = supabase.from("questions") as unknown as RawTable;

  for (const spec of specs) {
    const naturalKey = naturalKeyTag(subjectSlug, spec.ordinal);

    const { data: existing, error: queryError } = await supabase
      .from("questions")
      .select("id")
      .eq("seller_id", sellerId)
      .contains("topic_tags", [naturalKey])
      .maybeSingle();

    if (queryError) {
      throw new Error(
        `Failed to query existing question (${subjectSlug} q=${spec.ordinal}): ${queryError.message}`
      );
    }

    const payload = {
      seller_id: sellerId,
      question_type: spec.questionType,
      question_text: spec.questionText,
      rubric: spec.rubric as unknown as Json,
      model_answer: spec.modelAnswer,
      subject: dbSubject,
      topic_tags: spec.topicTags,
      difficulty: spec.difficulty,
      estimated_minutes: spec.estimatedMinutes,
      points: spec.points,
    };

    const existingId = (existing as { id: string } | null)?.id;
    if (existingId) {
      const { error: updateError } = await rawTable.update(payload).eq("id", existingId);
      if (updateError) {
        throw new Error(
          `Failed to update question ${existingId}: ${updateError.message}`
        );
      }
      log(
        { phase: "questions", subject: subjectSlug, q: spec.ordinal },
        `UPDATED (id=${existingId})`
      );
      outcomes.push({ spec, questionId: existingId, created: false });
    } else {
      const { data: inserted, error: insertError } = await rawTable
        .insert(payload)
        .select("id")
        .single();
      if (insertError || !inserted) {
        throw new Error(
          `Failed to insert question ${subjectSlug} q=${spec.ordinal}: ${insertError?.message ?? "no row"}`
        );
      }
      log(
        { phase: "questions", subject: subjectSlug, q: spec.ordinal },
        `CREATED (id=${inserted.id})`
      );
      outcomes.push({ spec, questionId: inserted.id, created: true });
    }
  }

  return outcomes;
}
