import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { problemSetRubricSchema } from "@toinoma/shared/schemas";
import { CollectionSolveClient } from "./collection-solve-client";

// ─── Types ────────────────────────────────────────────────────────────

interface CollectionProblem {
  id: string;
  collectionItemId: string;
  problemSetId: string;
  title: string;
  rubric: ReturnType<typeof problemSetRubricSchema.parse>;
  problemPdfUrl: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────

export default async function CollectionSolvePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch collection (verify ownership)
  const { data: collection } = await supabase
    .from("collections")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!collection) notFound();

  // Fetch collection items with problem set data
  const { data: items } = await supabase
    .from("collection_items")
    .select(
      "id, problem_set_id, position, problem_sets(id, title, rubric, problem_pdf_url)"
    )
    .eq("collection_id", id)
    .order("position", { ascending: true });

  if (!items || items.length === 0) {
    redirect(`/dashboard/collections/${id}`);
  }

  // Verify user has purchased all problem sets in the collection
  const problemSetIds = items.map((item) => item.problem_set_id);
  const { data: purchases } = await supabase
    .from("purchases")
    .select("problem_set_id")
    .eq("user_id", user.id)
    .in("problem_set_id", problemSetIds);

  const purchasedIds = new Set(
    (purchases ?? []).map((p) => p.problem_set_id)
  );

  // Build problems list (only purchased ones)
  const problems: CollectionProblem[] = [];
  const unpurchasedCount = { count: 0 };

  for (const item of items) {
    if (!purchasedIds.has(item.problem_set_id)) {
      unpurchasedCount.count++;
      continue;
    }

    const ps = item.problem_sets as unknown as {
      id: string;
      title: string;
      rubric: unknown;
      problem_pdf_url: string | null;
    } | null;

    if (!ps) continue;

    const rubricResult = problemSetRubricSchema.safeParse(ps.rubric);
    if (!rubricResult.success) continue;

    problems.push({
      id: `${item.id}`,
      collectionItemId: item.id,
      problemSetId: item.problem_set_id,
      title: ps.title,
      rubric: rubricResult.data,
      problemPdfUrl: ps.problem_pdf_url,
    });
  }

  // Fetch existing submissions to determine completion status
  const { data: submissions } = await supabase
    .from("submissions")
    .select("problem_set_id, score, max_score, created_at")
    .eq("user_id", user.id)
    .in("problem_set_id", problemSetIds)
    .order("created_at", { ascending: false });

  // Build completion map (latest submission per problem set)
  const completionMap: Record<string, { score: number; maxScore: number }> = {};
  for (const sub of submissions ?? []) {
    if (!completionMap[sub.problem_set_id]) {
      completionMap[sub.problem_set_id] = {
        score: sub.score ?? 0,
        maxScore: sub.max_score ?? 0,
      };
    }
  }

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <CollectionSolveClient
        collectionId={id}
        collectionName={collection.name}
        problems={problems}
        completionMap={completionMap}
        unpurchasedCount={unpurchasedCount.count}
      />
    </main>
  );
}
