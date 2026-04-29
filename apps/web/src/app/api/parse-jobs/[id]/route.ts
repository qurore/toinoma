/**
 * GET    /api/parse-jobs/[id] — fetch one job (owner-only).
 * DELETE /api/parse-jobs/[id] — cancel a queued/running job; deletes a finished one.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("parse_jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job: data });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: job } = await supabase
    .from("parse_jobs")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.status === "queued" || job.status === "running") {
    await supabase
      .from("parse_jobs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", id);
  } else {
    await supabase.from("parse_jobs").delete().eq("id", id);
  }

  return NextResponse.json({ ok: true });
}
