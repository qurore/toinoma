import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
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
      <div className="space-y-6">
        <Breadcrumbs items={[
          { label: "ホーム", href: "/" },
          { label: "設定", href: "/settings/profile" },
          { label: "通知設定" },
        ]} />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">通知設定</h1>
          <p className="text-sm text-muted-foreground">
            メール通知とアプリ内通知の設定を管理します
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
          <span className="mt-0.5 text-destructive" aria-hidden="true">!</span>
          <div>
            <p className="text-sm font-medium text-destructive">
              読み込みに失敗しました
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              通知設定を取得できませんでした。ページを再読み込みしてください。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: "ホーム", href: "/" },
        { label: "設定", href: "/settings/profile" },
        { label: "通知設定" },
      ]} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">通知設定</h1>
        <p className="text-sm text-muted-foreground">
          メール通知とアプリ内通知の設定を管理します
        </p>
      </div>

      <NotificationSettingsForm initialPreferences={result.data} />
    </div>
  );
}
