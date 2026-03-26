import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-hero py-24 sm:py-32">
      {/* Subtle radial gradient — no orbs */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(142_71%_38%/0.1),transparent_60%)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
          あなたの学習を、
          <br className="hidden sm:block" />
          次のレベルへ
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

        {/* Trust line — simple text */}
        <p className="mt-8 text-xs text-white/40">
          9科目対応 · 3つの出題形式 · AI部分点採点
        </p>
      </div>
    </section>
  );
}
