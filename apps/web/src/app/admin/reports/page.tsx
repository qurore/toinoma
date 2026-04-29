import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/admin";
import type { Metadata } from "next";
import type { Database } from "@/types/database";
import { AdminReportsClient } from "./admin-reports-client";

type ReportStatus = Database["public"]["Enums"]["report_status"];
type ReportReason = Database["public"]["Enums"]["report_reason"];

export const metadata: Metadata = {
  title: "報告管理 - 問の間",
};

// Shared type for the report row passed to the client component
export interface AdminReportRow {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  problem_set_id: string | null;
  review_id: string | null;
  qa_question_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  reporter_name: string | null;
  target_title: string | null;
}

export default async function AdminReportsPage(props: {
  searchParams: Promise<{
    status?: string;
    reason?: string;
    page?: string;
  }>;
}) {
  await requireAdmin();

  const searchParams = await props.searchParams;
  const statusFilter = searchParams.status ?? "all";
  const reasonFilter = searchParams.reason ?? "all";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const perPage = 20;

  const admin = createAdminClient();

  // Build query
  let dbQuery = admin
    .from("reports")
    .select(
      "id, reporter_id, reason, description, status, problem_set_id, review_id, qa_question_id, reviewed_by, reviewed_at, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    dbQuery = dbQuery.eq("status", statusFilter as ReportStatus);
  }
  if (reasonFilter !== "all") {
    dbQuery = dbQuery.eq("reason", reasonFilter as ReportReason);
  }

  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  dbQuery = dbQuery.range(from, to);

  const { data: reports, count: totalCount } = await dbQuery;
  const allReports = reports ?? [];

  // Fetch reporter display names
  const reporterIds = [
    ...new Set(allReports.map((r) => r.reporter_id)),
  ];
  const { data: reporters } =
    reporterIds.length > 0
      ? await admin
          .from("profiles")
          .select("id, display_name")
          .in("id", reporterIds)
      : { data: [] };
  const reporterMap = new Map(
    (reporters ?? []).map((p) => [p.id, p.display_name])
  );

  // Fetch target content titles
  const problemSetIds = allReports
    .map((r) => r.problem_set_id)
    .filter(Boolean) as string[];
  const { data: problemSets } =
    problemSetIds.length > 0
      ? await admin
          .from("problem_sets")
          .select("id, title")
          .in("id", problemSetIds)
      : { data: [] };
  const psMap = new Map(
    (problemSets ?? []).map((ps) => [ps.id, ps.title])
  );

  // Build enriched rows
  const rows: AdminReportRow[] = allReports.map((r) => ({
    id: r.id,
    reason: r.reason,
    description: r.description,
    status: r.status,
    problem_set_id: r.problem_set_id,
    review_id: r.review_id,
    qa_question_id: r.qa_question_id,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at,
    created_at: r.created_at,
    reporter_name: reporterMap.get(r.reporter_id) ?? null,
    target_title: r.problem_set_id
      ? psMap.get(r.problem_set_id) ?? null
      : null,
  }));

  const totalPages = Math.ceil((totalCount ?? 0) / perPage);

  return (
    <AdminReportsClient
      reports={rows}
      statusFilter={statusFilter}
      reasonFilter={reasonFilter}
      currentPage={page}
      totalPages={totalPages}
      totalCount={totalCount ?? 0}
    />
  );
}
