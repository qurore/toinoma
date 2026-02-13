import { Navbar } from "@/components/landing/navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { ValueSection } from "@/components/landing/value-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { SubjectsSection } from "@/components/landing/subjects-section";
import { CTASection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ValueSection />
        <HowItWorksSection />
        <SubjectsSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
