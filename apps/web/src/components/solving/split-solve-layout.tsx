"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface SplitSolveLayoutProps {
  problemSheet: React.ReactNode;
  answerSheet: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
}

export function SplitSolveLayout({
  problemSheet,
  answerSheet,
  header,
  footer,
}: SplitSolveLayoutProps) {
  const [activeTab, setActiveTab] = useState<"problem" | "answer">("problem");

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-2">
        {header}
      </div>

      {/* Mobile tab toggle */}
      <div className="flex shrink-0 border-b border-border md:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("problem")}
          className={cn(
            "flex-1 border-b-2 py-2 text-center text-sm font-medium transition-colors",
            activeTab === "problem"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          )}
        >
          問題
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("answer")}
          className={cn(
            "flex-1 border-b-2 py-2 text-center text-sm font-medium transition-colors",
            activeTab === "answer"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground"
          )}
        >
          解答
        </button>
      </div>

      {/* Split content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Problem sheet */}
        <div
          className={cn(
            "flex-1 overflow-y-auto border-r border-border",
            activeTab !== "problem" && "hidden md:block"
          )}
        >
          {problemSheet}
        </div>

        {/* Answer sheet */}
        <div
          className={cn(
            "flex-1 overflow-y-auto",
            activeTab !== "answer" && "hidden md:block"
          )}
        >
          {answerSheet}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-card px-4 py-2">
        {footer}
      </div>
    </div>
  );
}
