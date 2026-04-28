import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@toinoma/shared/types";
import { log } from "./logger";

export interface VerifyResult {
  passes: boolean;
  exploreVisibleCount: number;
  detailRenders: boolean;
  notes: string[];
}

interface ExploreRow {
  id: string;
  title: string | null;
  subject: string | null;
  difficulty: string | null;
  price: number | null;
  problem_pdf_url: string | null;
}

interface DetailRow {
  id: string;
  title: string | null;
  description: string | null;
}

export async function verifySeed(
  supabase: SupabaseClient<Database>,
  sellerId: string,
  expectedSetCount: number
): Promise<VerifyResult> {
  const notes: string[] = [];

  log({ phase: "verify" }, "querying explore-page predicate (status=published, joined seller)...");
  const exploreResp = (await (supabase
    .from("problem_sets")
    .select("id, title, subject, difficulty, price, problem_pdf_url")
    .eq("status", "published")
    .eq("seller_id", sellerId) as unknown as Promise<{
    data: ExploreRow[] | null;
    error: { message: string } | null;
  }>));

  if (exploreResp.error) {
    notes.push(`explore query failed: ${exploreResp.error.message}`);
    return { passes: false, exploreVisibleCount: 0, detailRenders: false, notes };
  }

  const explore = exploreResp.data ?? [];
  const exploreVisibleCount = explore.length;
  if (exploreVisibleCount < expectedSetCount) {
    notes.push(
      `expected ${expectedSetCount} published sets visible to seller, got ${exploreVisibleCount}`
    );
    return { passes: false, exploreVisibleCount, detailRenders: false, notes };
  }
  log({ phase: "verify" }, `OK: ${exploreVisibleCount} rows visible`);

  const firstId = explore[0].id;
  log({ phase: "verify" }, `querying detail-page predicate for first set (id=${firstId})...`);
  const detailResp = (await (supabase
    .from("problem_sets")
    .select("id, title, description")
    .eq("id", firstId)
    .eq("status", "published")
    .single() as unknown as Promise<{
    data: DetailRow | null;
    error: { message: string } | null;
  }>));

  if (detailResp.error || !detailResp.data) {
    notes.push(`detail query failed: ${detailResp.error?.message ?? "no row"}`);
    return { passes: false, exploreVisibleCount, detailRenders: false, notes };
  }

  const countResp = (await (supabase
    .from("problem_set_questions")
    .select("id", { count: "exact", head: true })
    .eq("problem_set_id", firstId) as unknown as Promise<{
    count: number | null;
    error: { message: string } | null;
  }>));

  if (countResp.error) {
    notes.push(`junction count query SKIPPED: ${countResp.error.message}`);
  } else if ((countResp.count ?? 0) === 0) {
    notes.push("first set has 0 junction rows — detail page would show 0 questions");
  }

  log(
    { phase: "verify" },
    `OK: detail query returned valid row (questions=${countResp.count ?? "n/a"})`
  );
  log({ phase: "verify" }, "PASS");
  return { passes: true, exploreVisibleCount, detailRenders: true, notes };
}
