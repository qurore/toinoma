import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  BookOpen,
  Brain,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-hero">
      {/* Background pattern — layered radial gradients for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(142_71%_38%/0.15),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(235_60%_52%/0.1),transparent_50%)]" />
      {/* Subtle dot grid pattern for texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden="true"
      />

      {/* Floating decorative orb — top-right */}
      <div
        className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-green/10 blur-3xl animate-float"
        aria-hidden="true"
      />
      {/* Floating decorative orb — bottom-left */}
      <div
        className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-indigo/10 blur-3xl animate-float [animation-delay:1.5s]"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-36 lg:pb-36 lg:pt-44">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left column — copy */}
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
            {/* Badge */}
            <div className="animate-fade-up opacity-0 [animation-delay:0ms]">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/15">
                <Sparkles className="h-3.5 w-3.5 text-green-light" />
                <span className="text-xs font-medium text-white/80">
                  AI採点で記述式の部分点を即座に判定
                </span>
              </div>
            </div>

            {/* Heading — lead with the user's goal */}
            <h1 className="animate-fade-up text-4xl font-bold leading-[1.15] tracking-tight text-white opacity-0 [animation-delay:100ms] sm:text-5xl lg:text-[3.5rem]">
              入試本番レベルの問題を
              <br />
              <span className="text-gradient-green inline-block">
                AIが即座に採点
              </span>
            </h1>

            {/* Subheading */}
            <p className="animate-fade-up mt-6 text-base leading-relaxed text-white/70 opacity-0 [animation-delay:200ms] sm:text-lg">
              大学生作問者がつくる本格入試問題で実戦力を鍛えよう。
              <br className="hidden sm:block" />
              記述式も部分点付きで、解いたその場で結果がわかる。
            </p>

            {/* CTAs */}
            <div className="animate-fade-up mt-8 flex flex-col items-center gap-3 opacity-0 [animation-delay:350ms] sm:flex-row lg:justify-start">
              <Button variant="hero" size="lg" className="group" asChild>
                <Link href="/explore">
                  無料で問題を解く
                  <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="lg" asChild>
                <Link href="/sell">出品者になる</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="animate-fade-up mt-8 flex flex-col gap-2.5 opacity-0 [animation-delay:500ms] sm:flex-row sm:gap-5 lg:justify-start">
              <div className="flex items-center justify-center gap-1.5 text-white/50 lg:justify-start">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs">9科目対応</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-white/50 lg:justify-start">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs">無料問題あり</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-white/50 lg:justify-start">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span className="text-xs">登録かんたん</span>
              </div>
            </div>
          </div>

          {/* Right column — visual mockup of the grading experience */}
          <div className="relative mx-auto hidden w-full max-w-md lg:mx-0 lg:block">
            <div className="animate-fade-up opacity-0 [animation-delay:300ms]">
              {/* Outer glow behind the card */}
              <div
                className="absolute -inset-4 rounded-3xl bg-green/10 blur-2xl"
                aria-hidden="true"
              />

              {/* Grading result preview card */}
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl backdrop-blur-md">
                {/* Card header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                      <Brain className="h-4 w-4 text-green-light" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        AI採点結果
                      </p>
                      <p className="text-[11px] text-white/40">
                        世界史 — 大問2
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full bg-green/20 px-3 py-1 text-xs font-bold text-green-light">
                    82 / 100
                  </div>
                </div>

                {/* Score breakdown rows */}
                <div className="space-y-3">
                  {[
                    {
                      label: "ウェストファリア条約への言及",
                      score: "3/3",
                      full: true,
                    },
                    {
                      label: "主権国家体制の形成過程",
                      score: "3/4",
                      full: false,
                    },
                    {
                      label: "論述の論理的一貫性",
                      score: "2/3",
                      full: false,
                    },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                    >
                      <span className="text-xs text-white/60">
                        {row.label}
                      </span>
                      <span
                        className={`text-xs font-semibold ${row.full ? "text-green-light" : "text-white/80"}`}
                      >
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

              {/* Floating accent badges around the card */}
              <div
                className="absolute -left-6 top-8 flex items-center gap-1.5 rounded-full border border-white/10 bg-forest/80 px-3 py-1.5 shadow-lg backdrop-blur-sm animate-float [animation-delay:0.5s]"
                aria-hidden="true"
              >
                <BookOpen className="h-3 w-3 text-green-light" />
                <span className="text-[11px] font-medium text-white/70">
                  9科目対応
                </span>
              </div>
              <div
                className="absolute -right-4 bottom-12 flex items-center gap-1.5 rounded-full border border-white/10 bg-forest/80 px-3 py-1.5 shadow-lg backdrop-blur-sm animate-float [animation-delay:1s]"
                aria-hidden="true"
              >
                <Shield className="h-3 w-3 text-green-light" />
                <span className="text-[11px] font-medium text-white/70">
                  部分点対応
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
