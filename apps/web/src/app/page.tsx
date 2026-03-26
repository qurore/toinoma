import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { ValueSection } from "@/components/landing/value-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { SubjectsSection } from "@/components/landing/subjects-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { MobileAppTabBar } from "@/components/navigation/mobile-app-tab-bar";
import {
  TrendingSection,
  NewArrivalsSection,
  TopRatedSection,
} from "@/components/landing/featured-sections";

export const metadata: Metadata = {
  title: "問の間 (Toinoma) — AI採点付き入試問題マーケットプレイス",
  description: "大学受験生のための、AI採点付き問題マーケットプレイス。大学生作問者がつくる本格入試問題で、実戦力を鍛えよう。9科目対応、記述式の部分点をAIが即座に判定。",
  openGraph: {
    title: "問の間 (Toinoma) — AI採点付き入試問題マーケットプレイス",
    description: "大学受験生のための、AI採点付き問題マーケットプレイス。",
    siteName: "Toinoma",
  },
};

// Labeled skeleton for featured sections — shows section title while cards load
function SectionSkeleton({ title, className }: { title: string; className?: string }) {
  return (
    <section className={`py-12 ${className ?? ""}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <Suspense fallback={<SectionSkeleton title="人気の問題セット" />}>
          <TrendingSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="新着問題セット" className="bg-secondary/30" />}>
          <NewArrivalsSection />
        </Suspense>
        <ValueSection />
        <HowItWorksSection />
        <Suspense fallback={<SectionSkeleton title="高評価の問題セット" />}>
          <TopRatedSection />
        </Suspense>
        <SubjectsSection />
        <CTASection />
      </main>
      <Footer />
      <MobileAppTabBar />
    </>
  );
}
