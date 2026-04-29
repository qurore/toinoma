"use server";

/**
 * Server actions for structured-content management.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  structuredContentSchema,
  type StructuredContent,
} from "@toinoma/shared/schemas";

export type SaveResult =
  | { ok: true; problemSetId: string }
  | { ok: false; error: string };

export async function saveStructuredContent(
  problemSetId: string,
  content: StructuredContent,
): Promise<SaveResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Not authenticated" };

  const parsed = structuredContentSchema.safeParse(content);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ") || "Invalid structured content",
    };
  }

  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, seller_id")
    .eq("id", problemSetId)
    .maybeSingle();
  if (!ps) return { ok: false, error: "Problem set not found" };

  const { data: seller } = await supabase
    .from("seller_profiles")
    .select("id")
    .eq("id", ps.seller_id)
    .maybeSingle();
  if (!seller || seller.id !== auth.user.id) {
    return { ok: false, error: "Not authorized" };
  }

  const writingMode =
    parsed.data.defaultWritingMode === "vertical" ? "vertical" : "horizontal";

  const { error } = await supabase
    .from("problem_sets")
    .update({
      structured_content: parsed.data as never,
      content_format: "structured",
      writing_mode: writingMode,
    })
    .eq("id", problemSetId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/seller/sets/${problemSetId}/edit`);
  revalidatePath(`/problem/${problemSetId}`);
  return { ok: true, problemSetId };
}

/**
 * Apply a successful parse-job result to a problem set's structured content.
 * Call this after the user reviews & accepts the parser output.
 */
export async function applyParseJobResult(
  problemSetId: string,
  jobId: string,
): Promise<SaveResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { ok: false, error: "Not authenticated" };

  const { data: job } = await supabase
    .from("parse_jobs")
    .select("id, status, result_ast")
    .eq("id", jobId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!job) return { ok: false, error: "Parse job not found" };
  if (job.status !== "succeeded") {
    return { ok: false, error: `Job is not in succeeded state: ${job.status}` };
  }
  if (!job.result_ast) return { ok: false, error: "Job has no result" };

  return saveStructuredContent(
    problemSetId,
    job.result_ast as unknown as StructuredContent,
  );
}
