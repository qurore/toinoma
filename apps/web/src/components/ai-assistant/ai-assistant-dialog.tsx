"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bot, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { AiChat } from "./ai-chat";

interface AiAssistantDialogProps {
  problemSetId?: string;
  isPro: boolean;
}

export function AiAssistantDialog({
  problemSetId,
  isPro,
}: AiAssistantDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating action button -- positioned above mobile tab bar on small screens */}
      <Button
        onClick={() => setOpen(true)}
        size="lg"
        className={cn(
          "fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full shadow-lg",
          "transition-transform hover:scale-105 active:scale-95",
          "md:bottom-6 md:right-6",
          "sm:h-auto sm:w-auto sm:rounded-full sm:px-5"
        )}
        aria-label="AI学習アシスタントを開く"
      >
        <Bot className="h-6 w-6 sm:mr-2 sm:h-5 sm:w-5" />
        <span className="hidden sm:inline">AI アシスタント</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* Mobile: full-screen overlay. Desktop: right-side panel. */}
        <DialogContent
          className={cn(
            // Reset the default centered dialog positioning
            "fixed left-auto right-0 top-0 h-full max-w-full translate-x-0 translate-y-0",
            "flex flex-col rounded-none border-l p-0",
            // Mobile: full screen
            "w-full",
            // Desktop: side panel
            "sm:w-[440px] sm:max-w-[440px]",
            // Override default dialog animations for slide-in
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            // Remove the default zoom animation
            "data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100"
          )}
        >
          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold">
                    AI 学習アシスタント
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    問題についてAIに質問できます
                  </DialogDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-8 w-8"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* Chat body */}
          <AiChat
            problemSetId={problemSetId}
            isPro={isPro}
            className="min-h-0 flex-1"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
