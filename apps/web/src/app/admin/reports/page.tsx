import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "報告管理 - 問の間",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromUntyped(supabase: SupabaseClient<any>, table: string) {
  return supabase.from(table);
}

const STATUS_LABELS: Record<string, string> = {
  pending: "未対応",
  reviewed: "確認済み",
  action_taken: "対応済み",
  dismissed: "却下",
};

const STATUS_VARIANTS: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
  pending: "destructive",
  reviewed: "default",
  action_taken: "secondary",
  dismissed: "outline",
};

const REASON_LABELS: Record<string, string> = {
  copyright: "著作権侵害",
  inappropriate: "不適切な内容",
  spam: "スパム",
  other: "その他",
};

export default async function AdminReportsPage() {
  const supabase = await createClient();

  const { data: reports } = await fromUntyped(supabase, "reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">報告管理</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            報告一覧（直近50件）
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!reports || reports.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              未対応の報告はありません
            </p>
          ) : (
            <div className="space-y-3">
              {reports.map(
                (report: {
                  id: string;
                  reason: string;
                  description: string | null;
                  status: string;
                  problem_set_id: string | null;
                  review_id: string | null;
                  created_at: string;
                }) => (
                  <div
                    key={report.id}
                    className="flex items-start justify-between rounded-md border p-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={STATUS_VARIANTS[report.status] ?? "outline"}
                          className="text-xs"
                        >
                          {STATUS_LABELS[report.status] ?? report.status}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {REASON_LABELS[report.reason] ?? report.reason}
                        </Badge>
                      </div>
                      {report.description && (
                        <p className="mt-1 text-sm text-foreground/80">
                          {report.description}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(report.created_at).toLocaleString("ja-JP")}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
