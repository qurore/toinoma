/**
 * POST /api/parse-jobs   — upload a PDF/DOCX, enqueue a parse job, kick off the runner.
 * GET  /api/parse-jobs   — list the current user's jobs (most recent first).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitByUser } from "@/lib/rate-limit";
import type { Subject } from "@toinoma/shared/types";
import { runParseJob } from "@/lib/parser/parse-job-runner";

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPTED_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const ALLOWED_SUBJECTS: Subject[] = [
  "math",
  "english",
  "japanese",
  "physics",
  "chemistry",
  "biology",
  "japanese_history",
  "world_history",
  "geography",
];

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  const userId = auth.user.id;

  const rl = await rateLimitByUser(`parse-jobs:${userId}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again in a moment." },
      { status: 429 },
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form payload" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024}MB)` },
      { status: 413 },
    );
  }
  if (!ACCEPTED_MIMES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported MIME: ${file.type}` },
      { status: 415 },
    );
  }

  const problemSetIdRaw = formData.get("problemSetId");
  const problemSetId =
    typeof problemSetIdRaw === "string" && problemSetIdRaw.length > 0
      ? problemSetIdRaw
      : null;

  if (problemSetId) {
    const { data: ps } = await supabase
      .from("problem_sets")
      .select("id, seller_id")
      .eq("id", problemSetId)
      .maybeSingle();
    if (!ps) {
      return NextResponse.json(
        { error: "Problem set not found" },
        { status: 404 },
      );
    }
    const { data: seller } = await supabase
      .from("seller_profiles")
      .select("id")
      .eq("id", ps.seller_id)
      .maybeSingle();
    if (!seller || seller.id !== userId) {
      return NextResponse.json(
        { error: "Not authorized for this problem set" },
        { status: 403 },
      );
    }
  }

  const subjectRaw = formData.get("subject");
  const subject =
    typeof subjectRaw === "string" && (ALLOWED_SUBJECTS as string[]).includes(subjectRaw)
      ? (subjectRaw as Subject)
      : null;

  // Upload to private parser-source path under the user's folder.
  const ext = file.type === "application/pdf" ? "pdf" : "docx";
  const objectPath = `${userId}/parser-source/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const admin = createAdminClient();
  const { error: uploadErr } = await admin.storage
    .from("problem-pdfs")
    .upload(objectPath, new Uint8Array(arrayBuffer), {
      contentType: file.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json(
      { error: `Upload failed: ${uploadErr.message}` },
      { status: 500 },
    );
  }

  const { data: jobRow, error: insertErr } = await supabase
    .from("parse_jobs")
    .insert({
      user_id: userId,
      problem_set_id: problemSetId,
      source_storage_bucket: "problem-pdfs",
      source_storage_path: objectPath,
      source_mime: file.type,
      source_subject: subject,
      status: "queued",
      progress: 0,
    })
    .select("*")
    .single();

  if (insertErr || !jobRow) {
    await admin.storage.from("problem-pdfs").remove([objectPath]);
    return NextResponse.json(
      { error: `Job creation failed: ${insertErr?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  // Fire-and-forget the runner. Failures are persisted to the job row.
  void runParseJob(jobRow.id).catch(() => {
    /* persisted to row */
  });

  return NextResponse.json({ jobId: jobRow.id, job: jobRow }, { status: 202 });
}

export async function GET(_req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("parse_jobs")
    .select(
      "id, status, progress, source_subject, source_mime, problem_set_id, error_code, error_message, pages_total, pages_processed, created_at, completed_at",
    )
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data ?? [] });
}
