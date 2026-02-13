import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import type { Database } from "@/types/database";

type SellerProfile = Database["public"]["Tables"]["seller_profiles"]["Row"];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("id", user.id)
    .single<SellerProfile>();

  const isSeller = !!sellerProfile?.tos_accepted_at && !!sellerProfile?.stripe_account_id;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">アカウント設定</h1>

      <div className="space-y-6">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">アカウント情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">メールアドレス</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">表示名</p>
              <p className="font-medium">
                {profile?.display_name ?? "未設定"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">認証方法</p>
              <p className="font-medium capitalize">
                {user.app_metadata?.provider ?? "email"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seller Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">販売者ステータス</CardTitle>
              <Badge variant={isSeller ? "default" : "secondary"}>
                {isSeller ? "有効" : "未登録"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isSeller ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">販売者名</p>
                  <p className="font-medium">
                    {sellerProfile.seller_display_name}
                  </p>
                </div>
                {sellerProfile.university && (
                  <div>
                    <p className="text-sm text-muted-foreground">大学</p>
                    <p className="font-medium">{sellerProfile.university}</p>
                  </div>
                )}
                <Separator />
                <Button variant="outline" asChild>
                  <Link href="/sell">販売者ダッシュボード</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="mb-3 text-sm text-muted-foreground">
                  問題セットを販売するには販売者登録が必要です
                </p>
                <Button asChild>
                  <Link href="/sell/onboarding">販売者登録を始める</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        {/* Subscription */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">サブスクリプション</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              AI採点の利用回数を増やすにはプランをアップグレードしてください
            </p>
            <Button variant="outline" asChild>
              <Link href="/settings/subscription">プランを管理する</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
