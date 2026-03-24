"use client";

import { useState, useTransition } from "react";
import { Loader2, Mail, Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  updateNotificationPreferences,
  type NotificationPreferences,
} from "./actions";

interface Category {
  id: string;
  label: string;
  description: string;
  emailKey: keyof NotificationPreferences;
  inappKey: keyof NotificationPreferences | null;
}

const CATEGORIES: Category[] = [
  {
    id: "purchase",
    label: "購入通知",
    description: "問題セットの購入確認や領収書",
    emailKey: "email_purchase",
    inappKey: "inapp_purchase",
  },
  {
    id: "grading",
    label: "採点通知",
    description: "AI採点の完了通知と結果概要",
    emailKey: "email_grading",
    inappKey: "inapp_grading",
  },
  {
    id: "review",
    label: "レビュー通知",
    description: "新しいレビューの投稿通知（出品者向け）",
    emailKey: "email_review",
    inappKey: "inapp_review",
  },
  {
    id: "announcement",
    label: "お知らせ",
    description: "プラットフォームからのお知らせ",
    emailKey: "email_announcement",
    inappKey: "inapp_announcement",
  },
  {
    id: "subscription",
    label: "サブスクリプション",
    description: "プラン更新や支払いリマインダー",
    emailKey: "email_subscription",
    inappKey: "inapp_subscription",
  },
  {
    id: "qa",
    label: "Q&A",
    description: "Q&Aの回答や返信の通知",
    emailKey: "email_qa",
    inappKey: "inapp_qa",
  },
  {
    id: "marketing",
    label: "マーケティング",
    description: "新機能やキャンペーンのお知らせ",
    emailKey: "email_marketing",
    inappKey: null, // email only
  },
];

interface NotificationSettingsFormProps {
  initialPreferences: NotificationPreferences;
}

export function NotificationSettingsForm({
  initialPreferences,
}: NotificationSettingsFormProps) {
  const [prefs, setPrefs] =
    useState<NotificationPreferences>(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const [hasChanges, setHasChanges] = useState(false);

  function handleToggle(key: keyof NotificationPreferences, value: boolean) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateNotificationPreferences(prefs);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("通知設定を保存しました");
        setHasChanges(false);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">通知カテゴリ</CardTitle>
          <CardDescription>
            カテゴリごとに通知のオン/オフを切り替えられます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* Header row */}
            <div className="flex items-center gap-4 border-b pb-3 text-xs font-medium text-muted-foreground">
              <span className="flex-1">カテゴリ</span>
              <span className="flex w-20 items-center justify-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                メール
              </span>
              <span className="flex w-20 items-center justify-center gap-1">
                <Bell className="h-3.5 w-3.5" />
                アプリ
              </span>
            </div>

            {/* Category rows */}
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-4 border-b border-border/50 py-4 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <Label className="text-sm font-medium">{cat.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {cat.description}
                  </p>
                </div>

                {/* Email toggle */}
                <div className="flex w-20 items-center justify-center">
                  <Switch
                    checked={prefs[cat.emailKey]}
                    onCheckedChange={(value) =>
                      handleToggle(cat.emailKey, value)
                    }
                    aria-label={`${cat.label}のメール通知`}
                  />
                </div>

                {/* In-app toggle */}
                <div className="flex w-20 items-center justify-center">
                  {cat.inappKey ? (
                    <Switch
                      checked={prefs[cat.inappKey]}
                      onCheckedChange={(value) =>
                        handleToggle(cat.inappKey!, value)
                      }
                      aria-label={`${cat.label}のアプリ通知`}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isPending || !hasChanges}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          保存する
        </Button>
        {hasChanges && (
          <p className="text-xs text-muted-foreground">未保存の変更があります</p>
        )}
      </div>
    </div>
  );
}
