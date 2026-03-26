import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionControls } from "./session-controls";

// ──────────────────────────────────────────────
// Session management page
// ──────────────────────────────────────────────

export const metadata: Metadata = {
  title: "セッション管理 - 問の間",
  description: "ログイン中のセッション情報を確認し、他のセッションをログアウトできます",
};

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings/sessions");

  // Extract session metadata from user
  const lastSignIn = user.last_sign_in_at;
  const provider =
    user.app_metadata?.provider ?? user.app_metadata?.providers?.[0] ?? "unknown";
  const email = user.email ?? "---";

  // Provider display label
  const providerLabels: Record<string, string> = {
    google: "Google",
    twitter: "X (Twitter)",
    email: "メール / パスワード",
  };
  const providerLabel = providerLabels[provider] ?? provider;

  // Detail rows for the current session table
  const sessionDetails = [
    { label: "メールアドレス", value: email },
    { label: "ログイン方法", value: providerLabel },
    ...(lastSignIn
      ? [
          {
            label: "最終ログイン日時",
            value: new Date(lastSignIn).toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "設定", href: "/settings/profile" },
        { label: "セッション" },
      ]} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">セッション管理</h1>
        <p className="text-sm text-muted-foreground">
          ログイン中のセッション情報を確認し、他のセッションをログアウトできます
        </p>
      </div>

      {/* Current session info */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">現在のセッション</CardTitle>
          <span className="text-xs font-medium text-success">
            アクティブ
          </span>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border/50">
            {sessionDetails.map((detail) => (
              <div
                key={detail.label}
                className="flex items-center justify-between py-3 text-sm first:pt-0 last:pb-0"
              >
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-medium">{detail.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security notice */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground">
          不審なアクティビティがある場合は、「他のセッションをログアウト」を実行してパスワードを変更してください。
        </p>
      </div>

      {/* Session controls: sign out others / everywhere */}
      <SessionControls />
    </div>
  );
}
