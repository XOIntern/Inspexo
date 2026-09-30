import {
  Blocks,
  ChartColumn,
  ClipboardCheck,
  FileCheck,
  History,
  Smartphone,
} from "lucide-react";
import { Reveal } from "@/components/home/reveal";

const features = [
  {
    icon: ClipboardCheck,
    title: "Inspections & checklists",
    body: "Standard templates, offline-capable field runs, consistent scoring at every site.",
  },
  {
    icon: FileCheck,
    title: "Findings & CAPA",
    body: "Every finding becomes an action with an owner, a due date, and escalation when it slips.",
  },
  {
    icon: History,
    title: "Audit trail",
    body: "Timestamped record of who saw what and when. Evidence a regulator accepts without digging.",
  },
  {
    icon: ChartColumn,
    title: "Reporting & analytics",
    body: "Compare sites and periods, show finding trends, and prove improvement over time.",
  },
  {
    icon: Smartphone,
    title: "Mobile inspections",
    body: "Full checklists, photos, and signatures on the phone. No laptop, no re-typing back at the desk.",
  },
  {
    icon: Blocks,
    title: "Integrations",
    body: "Connects with the tools operations already uses, so findings reach the right team's queue.",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-24 border-t border-border py-marketing"
    >
      <div className="container">
        <Reveal className="max-w-2xl">
          <h2 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            The whole inspection lifecycle, in one system.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 60}>
              <div className="group h-full rounded-2xl border border-border bg-card p-6 transition-colors hover:border-ring/40">
                <span className="grid size-11 place-items-center rounded-xl bg-accent text-brand-strong">
                  <feature.icon className="size-5" strokeWidth={2} />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
