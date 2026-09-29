import type { ReactNode } from "react";
import ScrollGlobeClient from "@/components/home/scroll-globe-client";

interface ScrollSection {
  id: string;
  badge?: string;
  title: string;
  subtitle?: string;
  description: string;
  align?: "left" | "center" | "right";
  features?: { title: string; description: string }[];
}

const sections: ScrollSection[] = [
  {
    id: "about",
    badge: "OUR PLATFORM",
    title: "Every inspection,",
    subtitle: "one clear view.",
    description:
      "InspeXO brings inspections, findings, and reports together so teams can see what needs attention across every site.",
    align: "left",
    features: [
      { title: "One workspace", description: "Keep site checks, evidence, and findings together." },
      { title: "Clear ownership", description: "Give every action a responsible owner and next step." },
    ],
  },
  {
    id: "description",
    badge: "HOW IT WORKS",
    title: "From observation",
    subtitle: "to action.",
    description:
      "Follow a practical inspection flow that keeps field teams and decision-makers aligned from the first check to the final report.",
    align: "center",
    features: [
      { title: "Inspect", description: "Run consistent checks at every location." },
      { title: "Resolve", description: "Record findings, evidence, and follow-up actions." },
    ],
  },
  {
    id: "why",
    badge: "WHY INSPEXO",
    title: "See issues sooner.",
    subtitle: "Move forward with confidence.",
    description:
      "Spend less time chasing updates and more time improving standards with clear, useful information for every team.",
    align: "left",
    features: [
      { title: "Know what matters", description: "Spot open risks and progress in one place." },
      { title: "Make the next step clear", description: "Turn inspection results into practical action." },
    ],
  },
];

function ScrollSection({ section }: { section: ScrollSection }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className={`relative z-20 flex min-h-[80vh] scroll-mt-32 flex-col justify-center overflow-hidden px-5 py-20 sm:min-h-screen sm:px-10 lg:px-16 ${
        section.align === "center"
          ? "items-center text-center"
          : section.align === "right"
            ? "items-end text-right"
            : "items-start text-left"
      }`}
    >
      <div
        className={`w-full max-w-2xl ${section.align === "center" ? "mx-auto" : section.align === "right" ? "ml-auto" : ""}`}
      >
        <p className="text-xs font-semibold tracking-[0.18em] text-ring">
          {section.badge}
        </p>
        <h2
          id={`${section.id}-title`}
          className="mt-4 text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.065em] text-foreground sm:text-5xl lg:text-6xl"
        >
          {section.title}
          {section.subtitle && (
            <span className="mt-2 block text-brand">{section.subtitle}</span>
          )}
        </h2>
        <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          {section.description}
        </p>
        {section.features && (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {section.features.map((feature) => (
              <article
                key={feature.title}
                className="rounded-2xl border border-border bg-white/85 p-4 text-left shadow-sm backdrop-blur-sm sm:p-5"
              >
                <h3 className="font-semibold text-accent-foreground">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function ScrollGlobe() {
  const content: ReactNode[] = sections.map((section) => (
    <ScrollSection key={section.id} section={section} />
  ));

  return (
    <ScrollGlobeClient sections={sections.map(({ id, badge, title }) => ({ id, badge, title }))}>
      {content}
    </ScrollGlobeClient>
  );
}
