/**
 * Parse-job runner: drives a single parse_jobs row from `queued` to `succeeded` / `failed`.
 *
 * Triggered by:
 *   • POST /api/parse-jobs (synchronously after enqueue)
 *   • Manual replay endpoint
 *   • A future cron sweeper for stuck jobs
 *
 * Uses the service-role Supabase client because the runner may execute outside the
 * authenticated user's request lifetime (e.g., Vercel functions detached from the
 * request that enqueued the job). All writes are scoped to the row's user_id.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { parseToStructuredContent, ParserError, type ParserSource } from "./parser";
import type { Database } from "@toinoma/shared/types";

type Row = Database["public"]["Tables"]["parse_jobs"]["Row"];

function mimeToKind(mime: string): "pdf" | "docx" | "image" | null {
  if (mime === "application/pdf") return "pdf";
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (mime.startsWith("image/")) return "image";
  return null;
}

function getServiceClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE service-role credentials");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface RunOptions {
  /** Override service client for tests. */
  client?: SupabaseClient<Database>;
}

export async function runParseJob(
  jobId: string,
  opts: RunOptions = {},
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const supabase = opts.client ?? getServiceClient();

  const { data: job, error: fetchErr } = await supabase
    .from("parse_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();

  if (fetchErr) return { ok: false, reason: fetchErr.message };
  if (!job) return { ok: false, reason: "Job not found" };
  if (job.status !== "queued" && job.status !== "running") {
    return { ok: false, reason: `Job is in terminal state: ${job.status}` };
  }

  await supabase
    .from("parse_jobs")
    .update({
      status: "running",
      progress: 5,
      attempt: job.attempt + 1,
      started_at: new Date().toISOString(),
      error_message: null,
      error_code: null,
    })
    .eq("id", jobId);

  try {
    const data = await downloadSource(supabase, job);
    const kind = mimeToKind(job.source_mime);
    if (!kind) {
      throw new ParserError(`Unsupported MIME: ${job.source_mime}`, "INPUT_INVALID");
    }

    await supabase
      .from("parse_jobs")
      .update({ progress: 25 })
      .eq("id", jobId);

    const source: ParserSource =
      kind === "image"
        ? { kind: "image", data, mime: job.source_mime }
        : { kind, data };

    const { ast, warnings, rawDurationMs } = await parseToStructuredContent(
      source,
      {
        subject: job.source_subject ?? undefined,
      },
    );

    await supabase
      .from("parse_jobs")
      .update({
        status: "succeeded",
        progress: 100,
        result_ast: ast as unknown as Database["public"]["Tables"]["parse_jobs"]["Row"]["result_ast"],
        result_warnings: warnings as unknown as Database["public"]["Tables"]["parse_jobs"]["Row"]["result_warnings"],
        completed_at: new Date().toISOString(),
        error_message: null,
        error_code: null,
      })
      .eq("id", jobId);

    if (job.problem_set_id) {
      await supabase
        .from("problem_sets")
        .update({
          structured_content: ast as unknown as Database["public"]["Tables"]["problem_sets"]["Row"]["structured_content"],
          content_format: "structured",
          writing_mode: ast.defaultWritingMode === "vertical" ? "vertical" : "horizontal",
        })
        .eq("id", job.problem_set_id);
    }

    return { ok: true };
  } catch (err) {
    const code =
      err instanceof ParserError ? err.code : "AI_CALL_FAILED";
    const message = err instanceof Error ? err.message : String(err);
    await supabase
      .from("parse_jobs")
      .update({
        status: "failed",
        error_code: code,
        error_message: message.slice(0, 1024),
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return { ok: false, reason: message };
  }
}

async function downloadSource(
  supabase: SupabaseClient<Database>,
  job: Row,
): Promise<Uint8Array> {
  const { data, error } = await supabase.storage
    .from(job.source_storage_bucket)
    .download(job.source_storage_path);
  if (error || !data) {
    throw new ParserError(
      `Storage download failed: ${error?.message ?? "no data"}`,
      "INPUT_INVALID",
      error,
    );
  }
  const ab = await data.arrayBuffer();
  return new Uint8Array(ab);
}
