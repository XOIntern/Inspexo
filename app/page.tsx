import ScrollGlobe from "@/components/scroll-globe";
import { HeroSection } from "@/components/hero";
import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <HeroSection />
      <ScrollGlobe />
    </>
  );
}
