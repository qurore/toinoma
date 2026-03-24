import Link from "next/link";
import { ArrowRight, Sparkles, BookCheck, Award } from "lucide-react";
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
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
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

      <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-32 sm:px-6 sm:pb-32 sm:pt-40 lg:pb-40 lg:pt-48">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="animate-fade-up opacity-0 [animation-delay:0ms]">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm transition-colors hover:border-white/30 hover:bg-white/15">
              <Sparkles className="h-3.5 w-3.5 text-green-light" />
              <span className="text-xs font-medium text-white/80">
                AI採点で記述式の部分点を即座に判定
              </span>
            </div>
          </div>

          {/* Heading */}
          <h1 className="animate-fade-up text-4xl font-bold leading-tight tracking-tight text-white opacity-0 [animation-delay:100ms] sm:text-5xl lg:text-6xl">
            問いと答えが
            <br />
            <span className="text-gradient-green inline-block">出会う場所</span>
          </h1>

          {/* Subheading */}
          <p className="animate-fade-up mt-6 text-lg leading-relaxed text-white/70 opacity-0 [animation-delay:200ms] sm:text-xl">
            大学受験生のための、AI採点付き問題マーケットプレイス。
            <br className="hidden sm:block" />
            大学生作問者がつくる本格入試問題で、実戦力を鍛えよう。
          </p>

          {/* CTAs */}
          <div className="animate-fade-up mt-10 flex flex-col items-center gap-4 opacity-0 [animation-delay:350ms] sm:flex-row sm:justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link href="/explore">
                問題を探す
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="lg" asChild>
              <Link href="/sell">出品者になる</Link>
            </Button>
          </div>

          {/* Social proof */}
          <div className="animate-fade-up mt-14 opacity-0 [animation-delay:500ms]">
            <div className="inline-flex items-center justify-center gap-6 rounded-full border border-white/10 bg-white/5 px-6 py-2.5 backdrop-blur-sm sm:gap-8">
              <div className="flex items-center gap-2 text-white/60 transition-colors hover:text-white/80">
                <BookCheck className="h-4 w-4" />
                <span className="text-sm font-medium">9科目対応</span>
              </div>
              <div className="h-4 w-px bg-white/15" aria-hidden="true" />
              <div className="flex items-center gap-2 text-white/60 transition-colors hover:text-white/80">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">AI部分点採点</span>
              </div>
              <div className="h-4 w-px bg-white/15" aria-hidden="true" />
              <div className="flex items-center gap-2 text-white/60 transition-colors hover:text-white/80">
                <Award className="h-4 w-4" />
                <span className="text-sm font-medium">無料問題あり</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
