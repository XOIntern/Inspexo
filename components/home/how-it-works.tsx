import { Reveal } from "@/components/home/reveal";

const steps = [
  {
    title: "Plan",
    body: "Build the checklist library and set the inspection schedule per site, shift, or asset.",
  },
  {
    title: "Inspect",
    body: "Teams run checks on mobile, with photos. Offline checks queue and sync when back in coverage.",
  },
  {
    title: "Close the loop",
    body: "Every action gets an owner and a due date, chased until it is verified.",
  },
  {
    title: "Report",
    body: "Audit-ready exports show the full trail, current the moment you pull them.",
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 border-t border-border py-marketing"
    >
      <div className="container">
        <Reveal className="max-w-2xl">
          <h2 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            From plan to signed-off report.
          </h2>
          <p className="mt-4 max-w-xl text-pretty leading-7 text-muted-foreground">
            Four steps, one system. The report writes itself because the work
            already happened in InspeXO.
          </p>
        </Reveal>

        <div className="relative mt-12">
          <div
            aria-hidden="true"
            className="absolute left-6 top-0 h-full w-px bg-border md:hidden"
          />
          <ol className="grid gap-10 md:grid-cols-4 md:gap-6">
            {steps.map((step, i) => (
              <li key={step.title} className="relative md:pt-2">
                <Reveal delay={i * 80}>
                  <div className="flex gap-5 md:block">
                    <span className="font-heading relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-ring/40 bg-card text-lg font-semibold text-brand-strong">
                      {i + 1}
                    </span>
                    <div className="pt-1.5 md:mt-4 md:pt-0">
                      <h3 className="font-heading text-lg font-semibold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
