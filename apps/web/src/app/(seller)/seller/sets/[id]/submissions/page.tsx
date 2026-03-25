import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "提出一覧 - 問の間",
};

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireSellerTos();
  const supabase = await createClient();

  // Verify ownership
  const { data: ps } = await supabase
    .from("problem_sets")
    .select("id, title")
    .eq("id", id)
    .eq("seller_id", user.id)
    .single();

  if (!ps) notFound();

  // Fetch submissions
  const { data: submissions } = await supabase
    .from("submissions")
    .select("id, user_id, score, max_score, graded_at, created_at")
    .eq("problem_set_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const allSubmissions = submissions ?? [];

  // Fetch user display names
  const userIds = [...new Set(allSubmissions.map((s) => s.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name])
  );

  // Stats
  const gradedSubmissions = allSubmissions.filter(
    (s) => s.score != null && s.max_score != null && s.max_score > 0
  );
  const avgScore =
    gradedSubmissions.length > 0
      ? Math.round(
          gradedSubmissions.reduce(
            (sum, s) => sum + (s.score! / s.max_score!) * 100,
            0
          ) / gradedSubmissions.length
        )
      : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { label: "ホーム", href: "/" },
          { label: "出品者ダッシュボード", href: "/seller" },
          { label: ps.title, href: `/seller/sets/${ps.id}/edit` },
          { label: "提出一覧" },
        ]}
        className="mb-4"
      />
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/seller/sets/${ps.id}/edit`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            問題セットに戻る
          </Link>
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          提出一覧: {ps.title}
        </h1>
        <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
          <span>{allSubmissions.length} 件の提出</span>
          <span>{userIds.length} 人の回答者</span>
          {avgScore !== null && <span>平均正答率: {avgScore}%</span>}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {allSubmissions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              まだ提出がありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">回答者</th>
                    <th className="pb-3 pr-4">スコア</th>
                    <th className="pb-3 pr-4">正答率</th>
                    <th className="pb-3">提出日時</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allSubmissions.map((s) => {
                    const pct =
                      s.score != null && s.max_score && s.max_score > 0
                        ? Math.round((s.score / s.max_score) * 100)
                        : null;

                    return (
                      <tr key={s.id}>
                        <td className="py-3 pr-4 font-medium">
                          {profileMap.get(s.user_id) ?? "匿名"}
                        </td>
                        <td className="py-3 pr-4">
                          {s.score != null
                            ? `${s.score}/${s.max_score}`
                            : "採点中"}
                        </td>
                        <td className="py-3 pr-4">
                          {pct !== null ? (
                            <Badge
                              variant={
                                pct >= 80
                                  ? "default"
                                  : pct >= 60
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {pct}%
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {new Date(s.created_at).toLocaleString("ja-JP")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
