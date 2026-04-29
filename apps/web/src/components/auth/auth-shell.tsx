"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────
// Shared brand-panel + form-pane shell used by every auth route
// (login / signup / forgot-password / reset-password).
//
// Keeping all four flows on the same shell removes the visual jump when
// users move between them and lets us iterate on auth chrome in one place.
// ──────────────────────────────────────────────

const benefits = [
  "AI採点で記述式の部分点を即座に判定",
  "大学生作問者による本格入試対策問題",
  "9科目対応、難易度別の問題検索",
  "学習進捗の可視化で効率的な受験対策",
];

interface AuthShellProps {
  /** Page heading rendered above the form (e.g. "ログイン") */
  heading: string;
  /** Sub-heading/description rendered below the heading */
  subheading?: string;
  /** The form + supporting body content */
  children: ReactNode;
  /**
   * Footer content rendered below the form (e.g. "アカウントをお持ちでない…").
   * Optional — pass `null` to omit.
   */
  footer?: ReactNode;
  /**
   * Legal disclosure rendered at the bottom (e.g. "ログインすることで、…利用規約").
   * Optional.
   */
  legal?: ReactNode;
  /**
   * Show the marketing benefits list inside the mobile body. Forgot/reset
   * flows hide this because the user is mid-recovery and benefits aren't
   * relevant; login/signup show it.
   */
  showMobileBenefits?: boolean;
}

export function AuthShell({
  heading,
  subheading,
  children,
  footer,
  legal,
  showMobileBenefits = false,
}: AuthShellProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left — Brand panel (hidden on mobile) */}
      <div className="hidden w-1/2 bg-hero lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link
          href="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold text-white">
              問の間
            </span>
            <span className="text-[10px] font-medium tracking-wider text-white/60">
              TOINOMA
            </span>
          </div>
        </Link>

        <div className="space-y-6 animate-fade-up">
          <h1 className="text-3xl font-bold leading-tight text-white">
            問いと答えが
            <br />
            出会う場所
          </h1>
          <ul className="space-y-2.5">
            {benefits.map((b) => (
              <li
                key={b}
                className="text-sm text-white/80 pl-3 relative before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-white/50"
              >
                {b}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-white/40">
          &copy; {new Date().getFullYear()} Toinoma
        </p>
      </div>

      {/* Right — Form pane */}
      <main className="flex flex-1 items-center justify-center p-6 pb-16 lg:p-12 lg:pb-12">
        <div
          className={cn(
            "w-full max-w-sm",
            "animate-fade-up [animation-delay:150ms] [animation-fill-mode:backwards]"
          )}
        >
          {/* Mobile logo */}
          <Link href="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold">問の間</span>
              <span className="text-[10px] font-medium tracking-wider text-muted-foreground">
                TOINOMA
              </span>
            </div>
          </Link>

          <h2 className="mb-1 text-2xl font-bold tracking-tight">{heading}</h2>
          {subheading && (
            <p className="mb-8 text-sm text-muted-foreground">{subheading}</p>
          )}
          {!subheading && <div className="mb-8" />}

          {children}

          {footer && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {footer}
            </p>
          )}

          {showMobileBenefits && (
            <ul className="mt-8 space-y-1.5 lg:hidden">
              {benefits.map((b) => (
                <li
                  key={b}
                  className="text-xs text-muted-foreground pl-3 relative before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-muted-foreground/40"
                >
                  {b}
                </li>
              ))}
            </ul>
          )}

          {legal && (
            <div className="mt-8 text-center text-xs text-muted-foreground">
              {legal}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
