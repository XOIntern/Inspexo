import { Header } from "@/components/home/header";
import { HeroSection } from "@/components/home/hero";
import { ProblemSection } from "@/components/home/problem";
import { SolutionSection } from "@/components/home/solution";
import { FeaturesSection } from "@/components/home/features";
import { HowItWorksSection } from "@/components/home/how-it-works";
import { BenefitsSection } from "@/components/home/benefits";
import { FaqCtaSection } from "@/components/home/faq-cta";
import { Footer } from "@/components/home/footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <HowItWorksSection />
        <BenefitsSection />
        <FaqCtaSection />
      </main>
      <Footer />
    </>
  );
}
