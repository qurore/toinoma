import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ProfileEditForm } from "@/components/settings/profile-edit-form";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const metadata = {
  title: "プロフィール設定",
};

export default async function ProfileSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single<Pick<Profile, "display_name" | "avatar_url">>();

  const provider = user.app_metadata?.provider ?? "email";
  const providerLabel: Record<string, string> = {
    google: "Google",
    twitter: "X (Twitter)",
    email: "メールアドレス",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">プロフィール</h1>
        <p className="text-sm text-muted-foreground">
          アカウント情報とプロフィールを管理します
        </p>
      </div>

      {/* Account info — read-only */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            アカウント情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">メールアドレス</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <Separator />
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">認証方法</span>
            <span className="text-sm font-medium">
              {providerLabel[provider] ?? provider}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* User info — editable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            ユーザー情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm
            userId={user.id}
            initialDisplayName={profile?.display_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
