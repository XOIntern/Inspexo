import { CircleAlert, CircleCheck, ClipboardCheck, FileCheck } from "lucide-react";
import { Reveal } from "@/components/home/reveal";

const steps = [
  { icon: ClipboardCheck, label: "Inspect" },
  { icon: CircleAlert, label: "Log finding" },
  { icon: FileCheck, label: "Assign action" },
  { icon: CircleCheck, label: "Verify close-out" },
];

export function SolutionSection() {
  return (
    <section
      id="solution"
      className="scroll-mt-24 border-t border-border py-marketing-lg"
    >
      <div className="container">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            One chain of evidence, from checklist to close-out.
          </h2>
          <p className="mt-4 text-pretty leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            InspeXO is the single system of record for the inspection
            lifecycle. Every step leaves a timestamped record an auditor can
            follow.
          </p>
        </Reveal>

        {/* Pipeline: vertical rail on mobile, horizontal flow from md up. */}
        <Reveal className="mt-12 sm:mt-16">
          <ol className="relative mx-auto flex max-w-sm flex-col gap-7 md:hidden">
            {/* Connecting rail through the icons */}
            <div
              aria-hidden="true"
              className="absolute left-[22px] top-4 bottom-4 w-px bg-border"
            />
            {steps.map((step) => (
              <li key={step.label} className="relative flex items-center gap-4">
                <span className="relative z-10 grid size-11 shrink-0 place-items-center rounded-full border border-ring/40 bg-card text-brand-strong">
                  <step.icon className="size-5" strokeWidth={2} />
                </span>
                <span className="font-heading text-base font-semibold text-foreground">
                  {step.label}
                </span>
              </li>
            ))}
          </ol>

          <ol className="hidden md:grid md:grid-cols-4 md:gap-4">
            {steps.map((step, i) => (
              <li
                key={step.label}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="flex w-full items-center">
                  <span
                    aria-hidden="true"
                    className={`h-px flex-1 bg-border ${i === 0 ? "opacity-0" : ""}`}
                  />
                  <span className="mx-3 grid size-12 shrink-0 place-items-center rounded-full border border-ring/40 bg-card text-brand-strong">
                    <step.icon className="size-5" strokeWidth={2} />
                  </span>
                  <span
                    aria-hidden="true"
                    className={`h-px flex-1 bg-border ${i === steps.length - 1 ? "opacity-0" : ""}`}
                  />
                </div>
                <span className="font-heading text-sm font-semibold tracking-tight text-foreground">
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>

        {/* Before / after */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-border bg-secondary/60 p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground">
                WITHOUT INSPEXO
              </p>
              <p className="mt-3 leading-7 text-secondary-foreground">
                A finding is a spreadsheet row, a phone photo, and a status
                meeting. Follow-up depends on who remembers.
              </p>
            </div>
          </Reveal>
          <Reveal delay={90}>
            <div className="h-full rounded-2xl border border-ring/30 bg-accent p-6">
              <p className="text-xs font-semibold tracking-[0.18em] text-brand-strong">
                WITH INSPEXO
              </p>
              <p className="mt-3 leading-7 text-accent-foreground">
                A finding is one record: raised in the field, assigned to an
                owner, tracked to verified close-out.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
