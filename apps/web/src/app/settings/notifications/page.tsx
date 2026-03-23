import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export const metadata: Metadata = {
  title: "通知設定 - 問の間",
};

const CATEGORIES = [
  {
    id: "purchases",
    label: "購入通知",
    description: "問題セットの購入確認",
    emailDefault: true,
    appDefault: true,
  },
  {
    id: "grading",
    label: "採点通知",
    description: "AI採点の完了通知",
    emailDefault: true,
    appDefault: true,
  },
  {
    id: "reviews",
    label: "レビュー通知",
    description: "新しいレビューの通知（出品者向け）",
    emailDefault: true,
    appDefault: true,
  },
  {
    id: "announcements",
    label: "お知らせ",
    description: "出品者からのお知らせ",
    emailDefault: true,
    appDefault: true,
  },
  {
    id: "subscription",
    label: "サブスクリプション",
    description: "プラン更新、支払いリマインダー",
    emailDefault: true,
    appDefault: true,
  },
  {
    id: "marketing",
    label: "マーケティング",
    description: "新機能やキャンペーンのお知らせ",
    emailDefault: false,
    appDefault: false,
  },
] as const;

export default function NotificationSettingsPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">通知設定</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        メール通知とアプリ内通知の設定を管理します
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">通知カテゴリ</CardTitle>
          <CardDescription>
            カテゴリごとに通知のオン/オフを切り替えられます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Header row */}
            <div className="flex items-center gap-4 border-b pb-2 text-xs font-medium text-muted-foreground">
              <span className="flex-1">カテゴリ</span>
              <span className="w-16 text-center">メール</span>
              <span className="w-16 text-center">アプリ</span>
            </div>

            {CATEGORIES.map((cat) => (
              <div key={cat.id} className="flex items-start gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{cat.label}</Label>
                  <p className="text-xs text-muted-foreground">
                    {cat.description}
                  </p>
                </div>
                <div className="flex w-16 items-center justify-center">
                  <input
                    type="checkbox"
                    defaultChecked={cat.emailDefault}
                    className="h-4 w-4 rounded border-border accent-primary"
                    aria-label={`${cat.label}のメール通知`}
                  />
                </div>
                <div className="flex w-16 items-center justify-center">
                  <input
                    type="checkbox"
                    defaultChecked={cat.appDefault}
                    className="h-4 w-4 rounded border-border accent-primary"
                    aria-label={`${cat.label}のアプリ通知`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
