import { Suspense } from "react";
import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { ValueSection } from "@/components/landing/value-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { SubjectsSection } from "@/components/landing/subjects-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import {
  TrendingSection,
  NewArrivalsSection,
  TopRatedSection,
} from "@/components/landing/featured-sections";

// Skeleton for featured sections while they load asynchronously
function SectionSkeleton() {
  return (
    <div className="py-16 md:py-20" aria-hidden="true">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Title skeleton */}
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-2.5">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        {/* Card skeletons — 4-column grid matching CardsGrid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-border bg-card"
            >
              <div className="h-40 animate-pulse bg-muted sm:h-44" />
              <div className="p-4">
                <div className="mb-2 flex gap-1.5">
                  <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
                  <div className="h-5 w-10 animate-pulse rounded-full bg-muted" />
                </div>
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-3 w-28 animate-pulse rounded bg-muted" />
                <div className="mt-1.5 h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main-content">
        <HeroSection />
        <Suspense fallback={<SectionSkeleton />}>
          <TrendingSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <NewArrivalsSection />
        </Suspense>
        <ValueSection />
        <HowItWorksSection />
        <Suspense fallback={<SectionSkeleton />}>
          <TopRatedSection />
        </Suspense>
        <SubjectsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
