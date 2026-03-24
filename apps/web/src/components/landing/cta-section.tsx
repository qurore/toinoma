import Link from "next/link";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-hero py-24 sm:py-32">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(142_71%_38%/0.2),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(235_60%_52%/0.1),transparent_50%)]" />
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
        {/* Decorative sparkle */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 backdrop-blur-sm">
          <Sparkles className="h-3.5 w-3.5 text-green-light" />
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
            <Link href="/login">
              無料で始める
              <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button variant="heroOutline" size="lg" asChild>
            <Link href="/explore">問題を見てみる</Link>
          </Button>
        </div>

        {/* Social proof — testimonial-style line */}
        <div className="mx-auto mt-12 max-w-md">
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-sm">
            {/* Star rating */}
            <div
              className="mb-2 flex items-center justify-center gap-0.5"
              aria-label="5つ星のうち5.0"
            >
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <p className="text-sm leading-relaxed text-white/60">
              &ldquo;記述式の部分点がその場でわかるのが画期的。自分では気づけない改善点をAIが指摘してくれるので、効率よく実力が伸びました。&rdquo;
            </p>
            <p className="mt-2 text-xs text-white/40">
              — 早稲田大学志望 高3受験生
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
