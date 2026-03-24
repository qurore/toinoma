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

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <Suspense fallback={null}>
          <TrendingSection />
        </Suspense>
        <Suspense fallback={null}>
          <NewArrivalsSection />
        </Suspense>
        <ValueSection />
        <HowItWorksSection />
        <Suspense fallback={null}>
          <TopRatedSection />
        </Suspense>
        <SubjectsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
