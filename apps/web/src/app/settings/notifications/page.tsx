import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotificationSettingsForm } from "./notification-settings-form";
import {
  getNotificationPreferences,
  type NotificationPreferences,
} from "./actions";

export const metadata: Metadata = {
  title: "通知設定 - 問の間",
};

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const result = await getNotificationPreferences();

  if (result.error || !result.data) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">通知設定</h1>
        <p className="text-sm text-destructive">
          通知設定の読み込みに失敗しました。ページを再読み込みしてください。
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">通知設定</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        メール通知とアプリ内通知の設定を管理します
      </p>

      <NotificationSettingsForm initialPreferences={result.data} />
    </div>
  );
}
