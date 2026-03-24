import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-hero py-20 sm:py-28">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(142_71%_38%/0.2),transparent_60%)]" />
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          今すぐ、学習を始めよう
        </h2>
        <p className="mt-4 text-lg text-white/70">
          無料で問題を解いて、AI採点の実力を体験してみませんか？
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button variant="hero" size="lg" asChild>
            <Link href="/login">
              無料で始める
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button variant="heroOutline" size="lg" asChild>
            <Link href="/explore">問題を見てみる</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
