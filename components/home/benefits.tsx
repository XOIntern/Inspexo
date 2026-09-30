import { Reveal } from "@/components/home/reveal";

/* Placeholder stats per brief ("placeholder stats OK"); footnoted so
   they are never mistaken for measured customer averages. */
const stats = [
  { value: "-70%", label: "time spent preparing for audits" },
  { value: "Days, not months", label: "to verified close-out of findings" },
  { value: "100%", label: "of findings carry an owner and a due date" },
  { value: "One", label: "system of record across every site" },
];

export function BenefitsSection() {
  return (
    <section id="benefits" className="scroll-mt-24">
      <div className="bg-primary py-marketing-lg text-primary-foreground">
        <div className="container">
          <Reveal className="max-w-2xl">
            <h2 className="font-heading text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              What changes when the work runs on one system
            </h2>
          </Reveal>

          <dl className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {stats.map((stat, i) => (
              <Reveal key={stat.value} delay={i * 70}>
                <div className="flex flex-col">
                  <dd className="font-heading order-1 text-4xl font-semibold tracking-tight sm:text-5xl">
                    {stat.value}
                  </dd>
                  <dt className="order-2 mt-2 text-sm leading-6 opacity-80">
                    {stat.label}
                  </dt>
                </div>
              </Reveal>
            ))}
          </dl>

          <p className="mt-12 text-sm opacity-70">
            Illustrative targets, not customer averages.
          </p>
        </div>
      </div>
    </section>
  );
}
