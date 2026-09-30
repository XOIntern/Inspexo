import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/home/reveal";

const faqs = [
  {
    q: "How long does implementation take?",
    a: "Most teams start running their first inspections in the first week: upload your existing checklists, add sites, invite users. Full rollout across sites and reporting is typically a one to two month structured onboarding.",
  },
  {
    q: "Does it work offline and on mobile?",
    a: "Yes. Inspections run on iOS and Android, store photos and signatures on device, and queue offline. Everything syncs to the audit trail once the device reconnects.",
  },
  {
    q: "Can we migrate our existing checklists?",
    a: "Import spreadsheets and existing templates as a starting point. Your team maps them once with us during onboarding, then maintains them directly in InspeXO.",
  },
  {
    q: "Does InspeXO integrate with our other systems?",
    a: "Findings and corrective actions can flow into the queues your teams already work from. Connectors and an API cover common maintenance, permit, and collaboration tools.",
  },
  {
    q: "How is pricing structured?",
    a: "Pricing is per site and per user role, based on scope. Book a demo for a quote that matches your sites, shift patterns, and reporting needs.",
  },
  {
    q: "Who owns the inspection data?",
    a: "You do. Records, photos, and the audit trail are yours, and they can be exported in full at any time.",
  },
];

export function FaqCtaSection() {
  return (
    <>
      <section
        id="faq"
        className="scroll-mt-24 border-t border-border py-marketing"
      >
        <div className="container">
          <Reveal className="max-w-2xl">
            <h2 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Questions HSE leaders ask before switching
            </h2>
          </Reveal>

          <div className="mt-10">
            {faqs.map((faq, i) => (
              <Reveal key={faq.q} delay={i * 50}>
                <details className="group border-b border-border">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 py-5 text-left font-semibold text-foreground transition-colors hover:text-brand-strong [&::-webkit-details-marker]:hidden">
                    {faq.q}
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45"
                    >
                      <span className="text-lg leading-none">+</span>
                    </span>
                  </summary>
                  <p className="pb-6 pr-10 leading-7 text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="final-cta"
        className="scroll-mt-24 bg-primary py-marketing text-primary-foreground"
      >
        <div className="container">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              See your next audit from the other side.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-pretty leading-7 opacity-80 sm:text-lg">
              Thirty minutes with your inspection data, not a slide deck.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="mailto:hello@inspexo.com?subject=Demo%20request"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary-foreground px-6 text-sm font-semibold text-primary shadow-[0_8px_20px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:opacity-90"
              >
                Book a demo
                <ArrowRight className="size-4" strokeWidth={2} />
              </a>
            </div>
            {/* Included line per brief */}
            <p className="mt-6 text-sm opacity-70">
              Includes onboarding, checklist migration, and support during
              rollout.
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
