import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CTASection() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="bg-hero relative mx-auto max-w-5xl overflow-hidden rounded-3xl p-12 text-center md:p-20">
        {/* Glow */}
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-teal/20 blur-3xl" />

        <div className="relative">
          <h2 className="font-display text-3xl font-bold text-white md:text-5xl">
            問いと答えが出会う場所
          </h2>
          <p className="mt-4 font-display text-lg text-white/60">
            Where questions meet answers.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
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
        </div>
      </div>
    </section>
  );
}
