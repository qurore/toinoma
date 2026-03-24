import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProfileEditForm } from "@/components/settings/profile-edit-form";
import { Shield } from "lucide-react";
import type { Database } from "@/types/database";
import type { Metadata } from "next";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export const metadata: Metadata = {
  title: "プロフィール設定 - 問の間",
  description: "アカウント情報とプロフィールを管理します",
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
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "設定", href: "/settings/profile" },
        { label: "プロフィール" },
      ]} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">プロフィール</h1>
        <p className="text-sm text-muted-foreground">
          アカウント情報とプロフィールを管理します
        </p>
      </div>

      {/* Account info — read-only */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              アカウント情報
            </CardTitle>
            <Badge variant="outline" className="gap-1.5 text-xs">
              <Shield className="h-3 w-3" />
              {providerLabel[provider] ?? provider}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">メールアドレス</span>
            <span className="text-sm font-medium">{user.email}</span>
          </div>
          <Separator />
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">ユーザーID</span>
            <span className="font-mono text-xs text-muted-foreground">
              {user.id.slice(0, 8)}...{user.id.slice(-4)}
            </span>
          </div>
          <Separator />
          <div className="grid grid-cols-[8rem_1fr] items-baseline gap-4">
            <span className="text-sm text-muted-foreground">作成日</span>
            <span className="text-sm font-medium">
              {new Date(user.created_at).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
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
