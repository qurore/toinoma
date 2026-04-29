import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitByUser } from "@/lib/rate-limit";
import { draftAnswersMapSchema } from "@toinoma/shared/schemas";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Rate budget: 60 writes/minute/user. The frontend debounces autosaves to
// roughly one per ~2-3s, so 60/min leaves headroom for retries and
// page-leave beacons.
const RATE_LIMIT_REQUESTS = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Maximum payload size in bytes (256 KB). Drafts should never approach this
// — even a 50KB essay is far below the cap. Anything larger is treated as
// a buggy client or a denial-of-service attempt.
const MAX_PAYLOAD_BYTES = 256 * 1024;

// Drafts inactive for more than DRAFT_TTL_DAYS are purged. 90 days matches the
// realistic entrance-exam prep cycle so a student who starts a problem set
// and returns 2 months later still finds their work. APPI-aligned retention.
const DRAFT_TTL_DAYS = 90;
const DRAFT_TTL_MS = DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const draftRequestBodySchema = z.object({
  problemSetId: z.string().uuid("Invalid problem set ID format"),
  answers: draftAnswersMapSchema,
});

// ---------------------------------------------------------------------------
// Shared error envelope helpers
// ---------------------------------------------------------------------------

function errorResponse(
  message: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

const ERR_UNAUTHORIZED = "認証が必要です。";
const ERR_RATE_LIMITED = "リクエストが多すぎます。しばらくお待ちください。";
const ERR_PAYLOAD_TOO_LARGE = "保存データが大きすぎます。";
const ERR_INVALID_BODY = "リクエスト本文が不正です。";
const ERR_NOT_PURCHASED = "この問題セットを購入していません。";
const ERR_INTERNAL = "保存に失敗しました。しばらくしてからもう一度お試しください。";

// Read the body as text so we can both enforce a size cap and accept
// `text/plain;charset=UTF-8` (sendBeacon's default Content-Type). The
// caller can then JSON.parse the result.
async function readBodyText(request: Request): Promise<{
  text: string;
  tooLarge: boolean;
}> {
  // Fast-path: trust Content-Length when present (most browsers and fetch
  // implementations send it for fixed-size bodies).
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_PAYLOAD_BYTES) {
    return { text: "", tooLarge: true };
  }
  const text = await request.text();
  if (text.length > MAX_PAYLOAD_BYTES) {
    return { text: "", tooLarge: true };
  }
  return { text, tooLarge: false };
}

// ---------------------------------------------------------------------------
// POST /api/draft
// Save (upsert) a draft for the authenticated user.
// Body shape: { problemSetId: uuid, answers: Record<string, DraftAnswer> }
// Response 200: { ok: true, savedAt: ISO_8601 }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const supabase = await createClient();

  // ── Auth ─────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse(ERR_UNAUTHORIZED, 401);
  }

  // ── Rate limit ───────────────────────────────────────────────────
  const rl = await rateLimitByUser(
    user.id,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rl.allowed) {
    return errorResponse(ERR_RATE_LIMITED, 429);
  }

  // ── Payload size cap ─────────────────────────────────────────────
  const { text, tooLarge } = await readBodyText(request);
  if (tooLarge) {
    return errorResponse(ERR_PAYLOAD_TOO_LARGE, 413);
  }

  // ── Parse + validate body ────────────────────────────────────────
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return errorResponse(ERR_INVALID_BODY, 400);
  }

  const parsed = draftRequestBodySchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue =
      parsed.error.issues[0]?.message ?? "Validation failed";
    return errorResponse(firstIssue, 400, {
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten(),
    });
  }
  const { problemSetId, answers } = parsed.data;

  // ── Purchase verification ────────────────────────────────────────
  // Drafts are only writable by users who have purchased the problem set.
  // RLS enforces user-isolation; this check enforces purchase-gating.
  const { data: purchase } = await supabase
    .from("purchases")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_set_id", problemSetId)
    .maybeSingle();

  if (!purchase) {
    return errorResponse(ERR_NOT_PURCHASED, 403);
  }

  // ── Upsert draft ─────────────────────────────────────────────────
  // user_id is taken from the authenticated session — never from the
  // request body — to defeat payload forgery.
  const nowIso = new Date().toISOString();
  const { error: upsertError } = await supabase
    .from("submission_drafts")
    .upsert(
      {
        user_id: user.id,
        problem_set_id: problemSetId,
        answers,
        last_active_at: nowIso,
      },
      { onConflict: "user_id,problem_set_id" }
    );

  if (upsertError) {
    console.error("[draft] upsert failed:", upsertError.message);
    return errorResponse(ERR_INTERNAL, 500, {
      code: "DB_ERROR",
    });
  }

  return NextResponse.json({ ok: true, savedAt: nowIso });
}

// ---------------------------------------------------------------------------
// GET /api/draft?problemSetId=<uuid>
// Returns 200 { draft: { answers, lastActiveAt, expiresAt } | null }
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse(ERR_UNAUTHORIZED, 401);
  }

  const rl = await rateLimitByUser(
    user.id,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rl.allowed) {
    return errorResponse(ERR_RATE_LIMITED, 429);
  }

  const url = new URL(request.url);
  const problemSetId = url.searchParams.get("problemSetId");

  const idValidation = z.string().uuid().safeParse(problemSetId);
  if (!idValidation.success) {
    return errorResponse(ERR_INVALID_BODY, 400, { code: "MISSING_PROBLEM_SET_ID" });
  }

  const { data, error } = await supabase
    .from("submission_drafts")
    .select("answers, last_active_at, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("problem_set_id", idValidation.data)
    .maybeSingle();

  if (error) {
    console.error("[draft] select failed:", error.message);
    return errorResponse(ERR_INTERNAL, 500, { code: "DB_ERROR" });
  }

  if (!data) {
    return NextResponse.json({ draft: null });
  }

  const lastActiveMs = new Date(data.last_active_at).getTime();
  const expiresAt = new Date(lastActiveMs + DRAFT_TTL_MS).toISOString();

  return NextResponse.json({
    draft: {
      answers: data.answers,
      lastActiveAt: data.last_active_at,
      expiresAt,
    },
  });
}

// ---------------------------------------------------------------------------
// DELETE /api/draft?problemSetId=<uuid>
// Returns 200 { deleted: true }
// ---------------------------------------------------------------------------

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse(ERR_UNAUTHORIZED, 401);
  }

  const rl = await rateLimitByUser(
    user.id,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW_MS
  );
  if (!rl.allowed) {
    return errorResponse(ERR_RATE_LIMITED, 429);
  }

  const url = new URL(request.url);
  const problemSetId = url.searchParams.get("problemSetId");
  const idValidation = z.string().uuid().safeParse(problemSetId);
  if (!idValidation.success) {
    return errorResponse(ERR_INVALID_BODY, 400, {
      code: "MISSING_PROBLEM_SET_ID",
    });
  }

  const { error } = await supabase
    .from("submission_drafts")
    .delete()
    .eq("user_id", user.id)
    .eq("problem_set_id", idValidation.data);

  if (error) {
    console.error("[draft] delete failed:", error.message);
    return errorResponse(ERR_INTERNAL, 500, { code: "DB_ERROR" });
  }

  return NextResponse.json({ deleted: true });
}
