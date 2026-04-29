import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// GET /api/cron/purge-drafts
// Vercel Cron handler — fallback for environments where pg_cron is not
// installed (or as belt-and-suspenders). Schedule: 0 3 * * * (daily 03:00).
// Auth: requires `Authorization: Bearer ${CRON_SECRET}` header set by Vercel.
// Calls the SQL function `purge_old_drafts()` which deletes rows whose
// last_active_at is older than 7 days and returns the deletion count.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;

  // If no CRON_SECRET is configured at runtime, refuse to run rather than
  // expose an unauthenticated purge endpoint.
  if (!expectedSecret) {
    console.error("[cron/purge-drafts] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("purge_old_drafts");
  if (error) {
    console.error("[cron/purge-drafts] purge_old_drafts failed:", error.message);
    return NextResponse.json(
      { error: "Purge failed", details: error.message },
      { status: 500 }
    );
  }

  const deleted = typeof data === "number" ? data : 0;

  return NextResponse.json({
    ok: true,
    deleted,
    purgedAt: new Date().toISOString(),
  });
}
