"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie, ChevronDown, ChevronUp } from "lucide-react";

const CONSENT_KEY = "toinoma_cookie_consent";

function getConsentSnapshot(): boolean {
  try {
    return !localStorage.getItem(CONSENT_KEY);
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function CookieConsent() {
  const shouldShow = useSyncExternalStore(
    subscribeToStorage,
    getConsentSnapshot,
    getServerSnapshot
  );
  const [dismissed, setDismissed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const visible = shouldShow && !dismissed;

  const handleAccept = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // Silently fail if localStorage is unavailable
    }
    setDismissed(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie同意バナー"
      className="fixed inset-x-0 bottom-14 z-50 border-t border-border bg-card p-4 shadow-lg md:bottom-0 sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-medium">Cookieの使用について</p>
            <p className="text-sm text-muted-foreground">
              当サイトでは、サービス提供・利便性向上のためにCookieを使用しています。
              サイトの利用を続けることで、Cookieの使用に同意したものとみなされます。
            </p>

            {detailsOpen && (
              <div className="mt-3 space-y-2 rounded-md border border-border bg-muted/50 p-3">
                <p className="text-xs font-medium">使用するCookieの種類</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>
                    <strong>必須Cookie:</strong>{" "}
                    ログインセッションの維持やセキュリティに必要です
                  </li>
                  <li>
                    <strong>機能Cookie:</strong>{" "}
                    表示設定やユーザーの好みを記憶します
                  </li>
                  <li>
                    <strong>分析Cookie:</strong>{" "}
                    サービス改善のためにアクセス状況を分析します
                  </li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  詳細は{" "}
                  <Link
                    href="/legal/privacy"
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    プライバシーポリシー
                  </Link>{" "}
                  をご覧ください。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDetailsOpen((prev) => !prev)}
          >
            {detailsOpen ? (
              <ChevronUp className="mr-1 h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="mr-1 h-3.5 w-3.5" />
            )}
            詳細
          </Button>
          <Button size="sm" onClick={handleAccept}>
            同意する
          </Button>
        </div>
      </div>
    </div>
  );
}
