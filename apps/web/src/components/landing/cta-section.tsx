import Link from "next/link";
import { ArrowRight, BookOpen, PenLine, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-hero py-24 sm:py-32">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(142_71%_38%/0.2),transparent_60%)]" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(235_60%_52%/0.1),transparent_50%)]" aria-hidden="true" />
      {/* Floating decorative orb */}
      <div
        className="absolute -right-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-green/15 blur-3xl animate-float"
        aria-hidden="true"
      />
      <div
        className="absolute -left-20 top-1/3 h-48 w-48 rounded-full bg-indigo/10 blur-3xl animate-float [animation-delay:2s]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        {/* Tagline badge */}
        <div className="mb-6 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
          <span className="text-xs font-medium text-white/70">
            登録無料 — 今すぐ始められます
          </span>
        </div>

        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          あなたの学習を、
          <br className="hidden sm:block" />
          <span className="text-gradient-green inline-block">
            次のレベルへ
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white/70">
          無料で問題を解いて、AI採点の実力を体験してみませんか？
          <br className="hidden sm:block" />
          アカウント登録はかんたん、すぐに始められます。
        </p>

        {/* CTA buttons */}
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button variant="hero" size="lg" className="group" asChild>
            <Link href="/signup">
              無料で始める
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button variant="heroOutline" size="lg" asChild>
            <Link href="/explore">問題を見てみる</Link>
          </Button>
        </div>

        {/* Trust signals — factual platform capabilities */}
        <div className="mx-auto mt-12 max-w-lg">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center backdrop-blur-sm">
              <BookOpen className="mx-auto mb-1.5 h-4 w-4 text-white/50" aria-hidden="true" />
              <p className="text-lg font-bold text-white">9科目</p>
              <p className="text-xs text-white/50">対応教科</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center backdrop-blur-sm">
              <PenLine className="mx-auto mb-1.5 h-4 w-4 text-white/50" aria-hidden="true" />
              <p className="text-lg font-bold text-white">3形式</p>
              <p className="text-xs text-white/50">記述・マーク・穴埋め</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center backdrop-blur-sm">
              <Brain className="mx-auto mb-1.5 h-4 w-4 text-white/50" aria-hidden="true" />
              <p className="text-lg font-bold text-white">AI採点</p>
              <p className="text-xs text-white/50">部分点つき即時採点</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
