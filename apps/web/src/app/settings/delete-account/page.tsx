import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountConfirm } from "@/components/settings/delete-account-confirm";
import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "退会 - 問の間",
  description: "アカウントの削除手続き",
};

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "設定", href: "/settings/profile" },
        { label: "アカウント削除" },
      ]} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-destructive">退会</h1>
        <p className="text-sm text-muted-foreground">
          アカウントを削除します。この操作は取り消せません。
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-medium text-destructive">
            この操作は取り消せません
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            退会するとアカウントに関連する全データが完全に削除されます。
          </p>
        </div>
      </div>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-destructive">
            退会前にご確認ください
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              購入済みの問題集へのアクセス権が失われます
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              すべての解答履歴・スコアが削除されます
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              お気に入り・コレクションが削除されます
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              出品者の場合、公開中の問題集が非公開になります
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
              未払いの収益は失効します（Stripe Connectのポリシーに従います）
            </li>
          </ul>

          <DeleteAccountConfirm />
        </CardContent>
      </Card>
    </div>
  );
}
