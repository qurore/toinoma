import Link from "next/link";
import { ArrowRight, Sparkles, BookCheck, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-hero">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(142_71%_38%/0.15),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(235_60%_52%/0.1),transparent_50%)]" />

      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-green-light" />
            <span className="text-xs font-medium text-white/80">
              AI採点で記述式の部分点を即座に判定
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            問いと答えが
            <br />
            <span className="text-gradient-green inline-block">出会う場所</span>
          </h1>

          {/* Subheading */}
          <p className="mt-6 text-lg leading-relaxed text-white/70 sm:text-xl">
            大学受験生のための、AI採点付き問題マーケットプレイス。
            <br className="hidden sm:block" />
            大学生作問者がつくる本格入試問題で、実戦力を鍛えよう。
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link href="/explore">
                問題を探す
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="heroOutline" size="lg" asChild>
              <Link href="/sell">出品者になる</Link>
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-white/50">
            <div className="flex items-center gap-2">
              <BookCheck className="h-4 w-4" />
              <span className="text-sm">9科目対応</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm">AI部分点採点</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="text-sm">無料問題あり</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
