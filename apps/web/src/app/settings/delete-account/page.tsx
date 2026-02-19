import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountConfirm } from "@/components/settings/delete-account-confirm";

export const metadata = {
  title: "退会",
};

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-destructive">退会</h1>
        <p className="text-sm text-muted-foreground">
          アカウントを削除します。この操作は取り消せません。
        </p>
      </div>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-destructive">
            退会前にご確認ください
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              購入済みの問題集へのアクセス権が失われます
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              すべての解答履歴・スコアが削除されます
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              お気に入り・コレクションが削除されます
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              出品者の場合、公開中の問題集が非公開になります
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-destructive">•</span>
              未払いの収益は失効します（Stripe Connectのポリシーに従います）
            </li>
          </ul>

          <DeleteAccountConfirm />
        </CardContent>
      </Card>
    </div>
  );
}

// Server Action for account deletion
export async function deleteAccountAction() {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Use service role to delete the auth user — cascades to profiles via DB triggers
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(user.id);

  if (error) {
    throw new Error("アカウントの削除に失敗しました");
  }

  redirect("/");
}
