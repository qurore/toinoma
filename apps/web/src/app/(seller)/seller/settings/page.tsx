import Link from "next/link";
import {
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { requireSellerTos } from "@/lib/auth/require-seller";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { SellerSettingsForm } from "./seller-settings-form";

export const metadata = {
  title: "出品者設定 - 問の間",
};

export default async function SellerSettingsPage() {
  const { user, sellerProfile } = await requireSellerTos();
  const supabase = await createClient();

  // Derive onboarding status
  const profileComplete =
    !!sellerProfile.seller_display_name &&
    sellerProfile.seller_display_name !== "__pending__";
  const stripeComplete = !!sellerProfile.stripe_account_id;

  // Fetch problem set stats for context
  const { count: publishedCount } = await supabase
    .from("problem_sets")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", user.id)
    .eq("status", "published");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "出品者ダッシュボード", href: "/seller" },
        { label: "出品者設定" },
      ]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">出品者設定</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          プロフィール・支払い・通知に関する設定
        </p>
      </div>

      {/* Seller profile edit */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                出品者プロフィール
              </CardTitle>
              <CardDescription>
                購入者に表示される出品者情報を編集できます
              </CardDescription>
            </div>
            {profileComplete ? (
              <Badge>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                設定済み
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="mr-1 h-3 w-3" />
                未設定
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <SellerSettingsForm
            profile={{
              sellerDisplayName:
                sellerProfile.seller_display_name === "__pending__"
                  ? ""
                  : sellerProfile.seller_display_name,
              sellerDescription: sellerProfile.seller_description,
              university: sellerProfile.university,
              circleName: sellerProfile.circle_name,
            }}
          />
        </CardContent>
      </Card>

      {/* Stripe Connect status */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                支払い設定（Stripe Connect）
              </CardTitle>
              <CardDescription>
                販売収益の受け取りに使用されるStripeアカウント
              </CardDescription>
            </div>
            {stripeComplete ? (
              <Badge>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                接続済み
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="mr-1 h-3 w-3" />
                未接続
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {stripeComplete ? (
            <>
              <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
                <span className="text-sm text-muted-foreground">
                  ステータス
                </span>
                <span className="text-sm font-medium text-primary">
                  アクティブ
                </span>
              </div>
              <Separator />
              <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
                <span className="text-sm text-muted-foreground">
                  アカウントID
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {sellerProfile.stripe_account_id}
                </span>
              </div>
              <Separator />
              <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
                <span className="text-sm text-muted-foreground">
                  公開セット数
                </span>
                <span className="text-sm font-medium">
                  {publishedCount ?? 0}件
                </span>
              </div>
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a
                    href="https://connect.stripe.com/express_login"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Stripeダッシュボードを開く
                    <ExternalLink className="ml-1.5 h-3 w-3" />
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/seller/payouts">
                    収益を確認
                  </Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <CreditCard className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="mb-1 font-medium">
                Stripe Connectの設定が必要です
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                有料問題セットの販売収益を受け取るにはStripeアカウントの接続が必要です
              </p>
              <Button asChild>
                <Link href="/seller/onboarding?step=3">
                  Stripeアカウントを接続
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Publishing preferences */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            出品の設定
          </CardTitle>
          <CardDescription>
            問題セット公開時のデフォルト設定
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">
              利用規約同意
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">同意済み</span>
              <span className="text-xs text-muted-foreground">
                {new Date(sellerProfile.tos_accepted_at!).toLocaleDateString(
                  "ja-JP",
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </span>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">
              公開レート上限
            </span>
            <span className="text-sm">
              24時間あたり5件まで
            </span>
          </div>
          <Separator />
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">
              プラットフォーム手数料
            </span>
            <span className="text-sm">
              15%（Stripe手数料はプラットフォーム負担）
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Notification settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            通知設定
          </CardTitle>
          <CardDescription>
            出品者向けのイベント通知を管理します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <NotificationRow
              label="購入通知"
              description="問題セットが購入されたときに通知を受け取ります"
              enabled
            />
            <Separator />
            <NotificationRow
              label="解答通知"
              description="購入者がセットに解答を提出したときに通知を受け取ります"
              enabled
            />
            <Separator />
            <NotificationRow
              label="レビュー通知"
              description="問題セットにレビューが投稿されたときに通知を受け取ります"
              enabled
            />
            <Separator />
            <NotificationRow
              label="収益通知"
              description="振込処理が完了したときに通知を受け取ります"
              enabled
            />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            通知はアプリ内で確認できます。メール通知の詳細設定は
            <Link href="/settings" className="ml-1 text-primary hover:underline">
              アカウント設定
            </Link>
            から行えます。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationRow({
  label,
  description,
  enabled,
}: {
  label: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant={enabled ? "default" : "secondary"} className="text-[10px]">
        {enabled ? "オン" : "オフ"}
      </Badge>
    </div>
  );
}
