import { ArrowRight } from "lucide-react";

import { HeroConstellation } from "@/components/home/hero-constellation";

export function HeroSection() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-screen items-center overflow-hidden scroll-mt-24"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,var(--accent),transparent_55%)] opacity-70"
      />

      <HeroConstellation />

      <div className="container flex flex-col items-center pb-20 pt-28 text-center sm:pt-32 lg:pb-24">
        <h1 className="font-heading max-w-[20ch] text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-tighter text-foreground">
          Run safe operations. Pass every audit.
        </h1>

        <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          InspeXO keeps inspections, findings, and corrective actions in one
          audit-ready system of record.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="#how-it-works"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-[0_8px_20px_rgba(23,61,49,0.16)] transition hover:-translate-y-0.5 hover:bg-primary/90"
          >
            See how it works
            <ArrowRight className="size-4" strokeWidth={2} />
          </a>

          <a
            href="#features"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card/70 px-6 text-sm font-semibold text-foreground transition hover:border-muted-foreground/50 hover:bg-card"
          >
            Explore features
            <ArrowRight className="size-4" strokeWidth={2} />
          </a>
        </div>
      </div>
    </section>
  );
}
