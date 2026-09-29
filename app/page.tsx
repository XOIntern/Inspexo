import ScrollGlobe from "@/components/home/scroll-globe";
import { HeroSection } from "@/components/home/hero";
import { Header } from "@/components/home/header";

export default function Home() {
  return (
    <>
      <Header />
      <HeroSection />
      <ScrollGlobe />
    </>
  );
}
