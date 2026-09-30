import { AlarmClock, EyeOff, FileSpreadsheet, Mail } from "lucide-react";
import { Reveal } from "@/components/home/reveal";

const pains = [
  {
    icon: FileSpreadsheet,
    title: "Checklists live in spreadsheets",
    body: "Every site keeps its own version, so answers drift and two plants can never be compared side by side.",
  },
  {
    icon: Mail,
    title: "Findings get stuck in inboxes",
    body: "A photo emailed to a supervisor has no owner, no due date, and no trail once it leaves the thread.",
  },
  {
    icon: AlarmClock,
    title: "Audit week becomes a fire drill",
    body: "Before a regulator visits, teams reconstruct months of records from shared drives and camera rolls.",
  },
  {
    icon: EyeOff,
    title: "Open corrective actions are invisible",
    body: "CAPA status lives in someone's head or a tab nobody opens, so overdue actions and repeat findings slip through.",
  },
];

export function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-24 py-marketing-lg">
      <div className="container grid gap-10 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <h2 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                The audit isn&rsquo;t the hard part. The paperwork is.
              </h2>
              <p className="mt-4 max-w-md text-pretty leading-7 text-muted-foreground">
                HSE teams don&rsquo;t lack discipline. They lack a system that keeps
                up with the field, so records stay scattered across tools
                nobody audits.
              </p>
            </Reveal>
          </div>
        </div>

        <div className="lg:col-span-7">
          <ol className="divide-y divide-border">
            {pains.map((pain, i) => (
              <li key={pain.title}>
                <Reveal delay={i * 70}>
                  <div className="flex gap-4 py-7 first:pt-0 sm:gap-5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent text-brand-strong">
                      <pain.icon className="size-5" strokeWidth={2} />
                    </span>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {pain.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground sm:text-base">
                        {pain.body}
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
