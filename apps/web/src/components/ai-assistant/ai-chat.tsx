"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Bot, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SuggestedPrompts } from "./suggested-prompts";
import { UsageIndicator } from "./usage-indicator";
import { createClient } from "@/lib/supabase/client";

interface AiChatProps {
  problemSetId?: string;
  isPro: boolean;
  className?: string;
}

/** Extract the concatenated text content from a UIMessage's parts array. */
function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("");
}

export function AiChat({ problemSetId, isPro, className }: AiChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [dailyUsage, setDailyUsage] = useState(0);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai-assistant",
        body: { problemSetId },
      }),
    [problemSetId]
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
    onError: (err) => {
      const message =
        err instanceof Error ? err.message : "エラーが発生しました";
      toast.error(message);
    },
    onFinish: () => {
      setDailyUsage((prev) => prev + 1);
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  // Fetch daily usage count on mount
  useEffect(() => {
    if (!isPro) return;

    async function fetchUsage() {
      const supabase = createClient();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("token_usage")
        .select("id", { count: "exact", head: true })
        .eq("model", "gemini-2.0-flash-assistant")
        .gte("created_at", startOfDay.toISOString());

      setDailyUsage(count ?? 0);
    }

    fetchUsage();
  }, [isPro]);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, status]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;

    sendMessage({ text: trimmed });
    setInputValue("");
  }, [inputValue, isStreaming, sendMessage]);

  // Handle Enter key (submit) and Shift+Enter (newline)
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Pro-only gate
  if (!isPro) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-4 p-8 text-center",
          className
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">AI 学習アシスタント</h3>
          <p className="text-sm text-muted-foreground">
            AI学習アシスタントはProプラン限定の機能です。
            <br />
            プランをアップグレードして、AIによる学習サポートを受けましょう。
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Proプラン限定
        </Badge>
        <Button asChild>
          <a href="/settings">
            <Sparkles className="mr-2 h-4 w-4" />
            プランをアップグレード
          </a>
        </Button>
      </div>
    );
  }

  const isLimitReached = dailyUsage >= 50;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Usage indicator */}
      <div className="shrink-0 border-b border-border px-4 py-2">
        <UsageIndicator used={dailyUsage} />
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4"
        role="log"
        aria-label="チャット履歴"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1 text-center">
              <p className="font-medium">AI 学習アシスタント</p>
              <p className="text-sm text-muted-foreground">
                問題について質問してみましょう
              </p>
            </div>
            <SuggestedPrompts onSelect={handleSuggestedPrompt} />
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const text = getMessageText(message);
              if (!text) return null;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {text}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Streaming indicator (shown only when submitted, before first text arrives) */}
            {status === "submitted" && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center rounded-2xl bg-muted px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            エラーが発生しました。もう一度お試しください。
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isLimitReached
                ? "本日の利用回数の上限に達しました"
                : "質問を入力してください..."
            }
            disabled={isStreaming || isLimitReached}
            rows={1}
            className="flex max-h-32 min-h-[2.5rem] w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="メッセージ入力"
          />
          <Button
            type="button"
            size="icon"
            disabled={isStreaming || !inputValue.trim() || isLimitReached}
            onClick={handleSend}
            aria-label="送信"
          >
            {isStreaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          AIの回答は参考情報です。正確性を保証するものではありません。
        </p>
      </div>
    </div>
  );
}
