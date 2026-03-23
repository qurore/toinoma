import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ユーザー管理 - 問の間",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch seller status for each user
  const userIds = (users ?? []).map((u) => u.id);
  const { data: sellers } = userIds.length > 0
    ? await supabase
        .from("seller_profiles")
        .select("id, tos_accepted_at, stripe_account_id")
        .in("id", userIds)
    : { data: [] };

  const sellerMap = new Map(
    (sellers ?? []).map((s) => [s.id, s])
  );

  const { data: subs } = userIds.length > 0
    ? await supabase
        .from("user_subscriptions")
        .select("user_id, tier")
        .in("user_id", userIds)
    : { data: [] };

  const subMap = new Map(
    (subs ?? []).map((s) => [s.user_id, s.tier])
  );

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        ユーザー管理
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            ユーザー一覧（直近50件）
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-4">ユーザー</th>
                  <th className="pb-3 pr-4">プラン</th>
                  <th className="pb-3 pr-4">出品者</th>
                  <th className="pb-3">登録日</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(users ?? []).map((user) => {
                  const seller = sellerMap.get(user.id);
                  const tier = subMap.get(user.id) ?? "free";
                  const initials = (user.display_name ?? "?")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={user.id}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={user.avatar_url ?? undefined} />
                            <AvatarFallback className="bg-primary/10 text-xs text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {user.display_name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge
                          variant={
                            tier === "pro"
                              ? "default"
                              : tier === "basic"
                                ? "secondary"
                                : "outline"
                          }
                          className="text-xs"
                        >
                          {tier}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {seller?.tos_accepted_at ? (
                          <Badge variant="secondary" className="text-xs">
                            {seller.stripe_account_id
                              ? "完了"
                              : "未完了"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
