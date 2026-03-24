import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationSettingsForm } from "./notification-settings-form";
import { getNotificationPreferences } from "./actions";

export const metadata: Metadata = {
  title: "通知設定 - 問の間",
  description: "メール通知とアプリ内通知の設定を管理します",
};

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/settings/notifications");

  const result = await getNotificationPreferences();

  if (result.error || !result.data) {
    return (
      <div>
        <h1 className="mb-1 text-xl font-bold tracking-tight">通知設定</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          メール通知とアプリ内通知の設定を管理します
        </p>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">
            通知設定の読み込みに失敗しました。ページを再読み込みしてください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold tracking-tight">通知設定</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        メール通知とアプリ内通知の設定を管理します
      </p>

      <NotificationSettingsForm initialPreferences={result.data} />
    </div>
  );
}
