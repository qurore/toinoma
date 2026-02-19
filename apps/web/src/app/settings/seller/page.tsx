import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ExternalLink, Store } from "lucide-react";
import type { Database } from "@/types/database";

type SellerProfile = Database["public"]["Tables"]["seller_profiles"]["Row"];

export const metadata = {
  title: "出品者情報",
};

export default async function SellerSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: sellerProfile } = await supabase
    .from("seller_profiles")
    .select("*")
    .eq("id", user.id)
    .single<SellerProfile>();

  const isSeller =
    !!sellerProfile?.tos_accepted_at && !!sellerProfile?.stripe_account_id;

  if (!isSeller) {
    // Non-sellers: guide them to onboarding
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">出品者情報</h1>
          <p className="text-sm text-muted-foreground">問題集の出品・販売に関する設定</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center">
            <Store className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="mb-1 font-medium">出品者登録が必要です</p>
            <p className="mb-5 text-sm text-muted-foreground">
              問題集を出品・販売するには出品者登録（利用規約同意・Stripe Connect設定）が必要です
            </p>
            <Button asChild>
              <Link href="/sell/onboarding">出品者登録を始める</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">出品者情報</h1>
        <p className="text-sm text-muted-foreground">問題集の出品・販売に関する設定</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              出品者プロフィール
            </CardTitle>
            <Badge>有効</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">出品者名</span>
            <span className="text-sm font-medium">
              {sellerProfile.seller_display_name}
            </span>
          </div>
          {sellerProfile.seller_description && (
            <>
              <Separator />
              <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
                <span className="text-sm text-muted-foreground">自己紹介</span>
                <span className="text-sm">{sellerProfile.seller_description}</span>
              </div>
            </>
          )}
          {sellerProfile.university && (
            <>
              <Separator />
              <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
                <span className="text-sm text-muted-foreground">大学</span>
                <span className="text-sm font-medium">{sellerProfile.university}</span>
              </div>
            </>
          )}
          {sellerProfile.circle_name && (
            <>
              <Separator />
              <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
                <span className="text-sm text-muted-foreground">サークル名</span>
                <span className="text-sm font-medium">{sellerProfile.circle_name}</span>
              </div>
            </>
          )}
          <Separator />
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">ToS同意日</span>
            <span className="text-sm">
              {new Date(sellerProfile.tos_accepted_at!).toLocaleDateString("ja-JP")}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button asChild>
          <Link href="/sell" className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            出品者ダッシュボード
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/sell/analytics" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            売上アナリティクス
          </Link>
        </Button>
      </div>
    </div>
  );
}
