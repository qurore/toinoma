import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-hero">
      {/* Subtle radial gradient for depth — no dots, no orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(142_71%_38%/0.08),transparent_70%)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-36 lg:pb-32 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column — copy */}
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left animate-fade-in opacity-0">
            {/* Heading — lead with the user's goal */}
            <h1 className="text-4xl font-bold leading-[1.15] tracking-tight text-white sm:text-5xl lg:text-[3.5rem]">
              入試本番レベルの問題を
              <br />
              <span className="text-gradient-green inline-block">
                AIが即座に採点
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base leading-relaxed text-white/70 sm:text-lg">
              大学生作問者がつくる本格入試問題で実戦力を鍛えよう。
              <br className="hidden sm:block" />
              記述式も部分点付きで、解いたその場で結果がわかる。
            </p>

            {/* CTA — single primary action */}
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
              <Button variant="hero" size="lg" className="group" asChild>
                <Link href="/explore">
                  無料で問題を解く
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </div>

            {/* Search — let users jump directly to what they need */}
            <div className="mt-6">
              <form action="/explore" method="get" className="relative mx-auto max-w-md lg:mx-0">
                <label htmlFor="hero-search" className="sr-only">問題を検索</label>
                <input
                  id="hero-search"
                  type="text"
                  name="q"
                  placeholder="教科名や大学名で検索..."
                  className="h-11 w-full rounded-full border border-white/20 bg-white/10 pl-4 pr-12 text-sm text-white placeholder:text-white/40 backdrop-blur-sm transition-colors focus:border-white/40 focus:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
                  aria-label="検索"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </button>
              </form>
            </div>

            {/* Trust indicators — simple text */}
            <p className="mt-6 text-xs text-white/50">
              9科目対応 · 無料問題あり · 登録かんたん
            </p>
          </div>

          {/* Right column — grading result preview card */}
          <div className="relative mx-auto hidden w-full max-w-md lg:mx-0 lg:block animate-fade-in opacity-0">
            <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-md">
              {/* Card header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    AI採点結果
                  </p>
                  <p className="text-[11px] text-white/40">
                    世界史 — 大問2
                  </p>
                </div>
                <div className="rounded-full bg-green/20 px-3 py-1 text-xs font-bold text-green-light">
                  82 / 100
                </div>
              </div>

              {/* Score breakdown rows */}
              <div className="space-y-3">
                {[
                  { label: "ウェストファリア条約への言及", score: "3/3", full: true },
                  { label: "主権国家体制の形成過程", score: "3/4", full: false },
                  { label: "論述の論理的一貫性", score: "2/3", full: false },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                  >
                    <span className="text-xs text-white/60">{row.label}</span>
                    <span className={`text-xs font-semibold ${row.full ? "text-green-light" : "text-white/80"}`}>
                      {row.score}
                    </span>
                  </div>
                ))}
              </div>

              {/* Feedback preview */}
              <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2.5">
                <p className="mb-1 text-[11px] font-medium text-white/40">
                  改善アドバイス
                </p>
                <p className="text-xs leading-relaxed text-white/60">
                  主権国家体制の形成について、三十年戦争との因果関係をより明確に記述すると得点率が向上します。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
