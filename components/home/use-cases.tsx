"use client";

import { useState } from "react";
import { Reveal } from "@/components/home/reveal";

const industries = [
  {
    name: "Manufacturing",
    description:
      "Lines, shift handovers, and housekeeping checks that have to be consistent across every plant.",
    checks: ["5S & housekeeping", "LOTO", "Machine guarding", "PPE compliance"],
  },
  {
    name: "Oil & Gas",
    description:
      "Permit-to-work, process safety, and equipment integrity rounds across remote and offshore sites.",
    checks: ["Permit to work", "Process safety rounds", "Equipment integrity", "Emergency drills"],
  },
  {
    name: "Construction",
    description:
      "Site inductions through to handover, with a trail that survives subcontractor turnover.",
    checks: ["Site induction", "Working at height", "Scaffolding & excavation", "Toolbox talks"],
  },
  {
    name: "Energy & Utilities",
    description:
      "From switchroom to substation: environmental incidents and contractor management on one trail.",
    checks: ["Switchroom safety", "LOTO", "Environmental incidents", "Contractor management"],
  },
];

export function UseCasesSection() {
  const [active, setActive] = useState(0);

  return (
    <section
      id="use-cases"
      className="scroll-mt-24 border-t border-border py-marketing"
    >
      <div className="container">
        <Reveal className="max-w-2xl">
          <h2 className="font-heading text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built for the checks your industry runs
          </h2>
          <p className="mt-4 max-w-xl text-pretty leading-7 text-muted-foreground">
            The lifecycle is the same everywhere. The checklists are not. Pick
            an industry to see what teams typically run in InspeXO.
          </p>
        </Reveal>

        <Reveal className="mt-8">
          <div
            role="group"
            aria-label="Filter by industry"
            className="flex flex-wrap gap-2"
          >
            {industries.map((industry, i) => (
              <button
                key={industry.name}
                type="button"
                aria-pressed={active === i}
                onClick={() => setActive(i)}
                className={`h-10 rounded-full border px-4 text-sm font-medium transition-colors ${
                  active === i
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-ring/40 hover:text-foreground"
                }`}
              >
                {industry.name}
                {active === i ? "" : ""}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-8">
          <div
            key={active}
            className="animate-tab-enter rounded-2xl border border-border bg-card p-6 sm:p-8"
          >
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-6">
                <h3 className="font-heading text-xl font-semibold tracking-tight text-foreground">
                  {industries[active].name}
                </h3>
                <p className="mt-3 max-w-md leading-7 text-muted-foreground">
                  {industries[active].description}
                </p>
              </div>
              <div className="lg:col-span-6">
                <p className="text-sm font-semibold text-foreground">
                  Typical inspections
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {industries[active].checks.map((check) => (
                    <li
                      key={check}
                      className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                    >
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
