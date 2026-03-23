import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "請求履歴 - 問の間",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch purchases
  const { data: purchases } = await supabase
    .from("purchases")
    .select("id, amount_paid, created_at, problem_set_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allPurchases = purchases ?? [];

  // Fetch problem set titles
  const setIds = [...new Set(allPurchases.map((p) => p.problem_set_id))];
  const { data: sets } = setIds.length > 0
    ? await supabase
        .from("problem_sets")
        .select("id, title")
        .in("id", setIds)
    : { data: [] };

  const setMap = new Map((sets ?? []).map((s) => [s.id, s.title]));

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">請求履歴</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        購入履歴とお支払い情報を確認できます
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">購入履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {allPurchases.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              購入履歴がありません
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">日付</th>
                    <th className="pb-3 pr-4">問題セット</th>
                    <th className="pb-3 text-right">金額</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allPurchases.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString("ja-JP")}
                      </td>
                      <td className="py-3 pr-4 font-medium">
                        {setMap.get(p.problem_set_id) ?? "—"}
                      </td>
                      <td className="py-3 text-right">
                        {p.amount_paid === 0 ? (
                          <Badge variant="secondary" className="text-xs">
                            無料
                          </Badge>
                        ) : (
                          `¥${p.amount_paid.toLocaleString()}`
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
