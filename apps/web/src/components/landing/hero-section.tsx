import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const stats = [
  { value: "9科目", label: "対応教科" },
  { value: "AI採点", label: "自動フィードバック" },
  { value: "15%", label: "手数料のみ" },
];

export function HeroSection() {
  return (
    <section className="bg-hero relative flex min-h-[90vh] items-center overflow-hidden pt-16">
      {/* Glow effect */}
      <div className="absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-green/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="opacity-0 animate-fade-up">
            <Badge className="mb-6 border-green/30 bg-green/10 px-4 py-1.5 text-sm font-medium text-green-light backdrop-blur-sm">
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              AI採点で、学びが変わる
            </Badge>
          </div>

          {/* Title */}
          <h1 className="opacity-0 animate-fade-up font-display text-5xl font-bold leading-tight tracking-tight md:text-7xl [animation-delay:100ms]">
            <span className="text-white">問の間</span>
            <br />
            <span className="text-gradient-green">Toinoma</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 opacity-0 animate-fade-up [animation-delay:200ms]">
            大学生が作るオリジナル入試問題を、
            <br className="hidden sm:block" />
            AIが即座に採点・フィードバック。
            <br className="hidden sm:block" />
            あなたの実力を、もっと伸ばせる場所。
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-wrap gap-4 opacity-0 animate-fade-up [animation-delay:300ms]">
            <Button variant="hero" size="lg" asChild>
              <Link href="/explore">
                問題を探す
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="lg" asChild>
              <Link href="/sell/onboarding">出題者になる</Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 opacity-0 animate-fade-up [animation-delay:400ms]">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="font-display text-2xl font-bold text-green-glow md:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
