import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SessionControls } from "./session-controls";

// ──────────────────────────────────────────────
// USR-013: Session management
// ──────────────────────────────────────────────

export default async function SessionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings/sessions");

  // Extract session metadata from user
  const lastSignIn = user.last_sign_in_at;
  const provider =
    user.app_metadata?.provider ?? user.app_metadata?.providers?.[0] ?? "不明";
  const email = user.email ?? "---";

  // Provider display label
  const providerLabels: Record<string, string> = {
    google: "Google",
    twitter: "X (Twitter)",
    email: "メール",
  };
  const providerLabel = providerLabels[provider] ?? provider;

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">セッション管理</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        ログイン中のセッション情報を確認し、他のセッションをログアウトできます
      </p>

      {/* Current session info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">現在のセッション</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">メールアドレス</span>
            <span className="font-medium">{email}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ログイン方法</span>
            <span className="font-medium">{providerLabel}</span>
          </div>
          {lastSignIn && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                最終ログイン日時
              </span>
              <span className="font-medium">
                {new Date(lastSignIn).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">ステータス</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              アクティブ
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Session controls */}
      <SessionControls />
    </div>
  );
}
