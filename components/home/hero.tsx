import Image from "next/image";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const inspections = [
  { label: "General", count: "74%", status: "Reviewed" },
  { label: "HSE", count: "88%", status: "Good" },
  { label: "Food Safety", count: "0%", status: "Open findings" },
  { label: "EMS ", count: "97%", status: "Very good" },
];

export function HeroSection() {
  return (
    <main
      id="top"
      className="relative isolate min-h-screen overflow-hidden bg-background text-foreground"
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(189,220,198,0.42),transparent_48%)]"
      />
      {/* =========================
          HERO
      ========================== */}
      <section className="container grid w-full items-center gap-10 pb-12 pt-8 sm:gap-12 sm:pb-16 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:pb-24 lg:pt-20">
        {/* =========================
            LEFT CONTENT
        ========================== */}
        <div className="relative z-10 mx-auto max-w-xl lg:mx-0">
          {/* Small badge */}
          <a
            href="#workflow"
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-white/80 py-1.5 pl-2 pr-3 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition hover:border-muted-foreground/50 sm:text-sm"
          >
            <span className="grid size-6 place-items-center rounded-full bg-accent text-brand-strong">
              <Sparkles className="size-3.5" />
            </span>
            A clearer way to inspect
            <ArrowRight className="ml-0.5 size-3.5 text-brand-strong" />
          </a>

          {/* Heading */}
          <h1 className="max-w-[12ch] text-balance text-[clamp(2.75rem,10.5vw,5.7rem)] font-semibold leading-[0.98] tracking-[-0.075em] text-foreground sm:text-[clamp(3.25rem,7vw,5.7rem)]">
            See every detail.{" "}
            <span className="text-brand">Move forward.</span>
          </h1>

          {/* Description */}
          <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Inspections, findings, and reports in one calm, simple workspace.
            Give every site a clearer next step.
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#workspace"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(23,61,49,0.16)] transition hover:-translate-y-0.5 hover:bg-primary/90"
            >
              Explore the workspace
              <ArrowRight className="size-4" />
            </a>

            <a
              href="#workflow"
              className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-white/70 px-6 text-sm font-semibold text-accent-foreground transition hover:border-muted-foreground/50 hover:bg-white"
            >
              See how it works
            </a>
          </div>

          {/* Feature highlights */}
          <div
            id="proof"
            className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-muted-foreground sm:text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-brand" />
              Built for confident decisions
            </span>

            <span className="hidden h-4 border-l border-border sm:block" />

            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4 text-brand" />
              Less time chasing updates
            </span>
          </div>
        </div>

        {/* =========================
            RIGHT PREVIEW
        ========================== */}
        <div
          id="workspace"
          className="relative mx-auto w-full max-w-165 scroll-mt-32 lg:ml-auto"
        >
          {/* Glow */}
          <div
            aria-hidden="true"
            className="absolute -inset-8 -z-10 rounded-[3rem] bg-brand/50 blur-3xl"
          />

          {/* Report ready floating card */}
          <div className="absolute -right-3 top-10 z-10 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-[0_14px_40px_rgba(34,55,42,0.12)] sm:flex lg:-right-6">
            <span className="grid size-8 place-items-center rounded-xl bg-accent text-success">
              <Check className="size-4" />
            </span>

            <span>
              <span className="block text-xs font-semibold text-secondary-foreground">
                Report ready
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground/80">
                All findings organized
              </span>
            </span>
          </div>

          {/* Dashboard preview */}
          <div className="overflow-hidden rounded-[1.6rem] border border-border bg-white shadow-[0_28px_80px_rgba(38,59,43,0.13)] sm:rounded-[2rem]">
            {/* Preview header */}
            <div className="flex items-center justify-between border-b border-secondary px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-accent text-success">
                  <ClipboardCheck className="size-4" />
                </span>

                <div>
                  <p className="text-sm font-semibold tracking-tight text-secondary-foreground">
                    HSE Audit Results
                  </p>

                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                    Latest audit assessment
                  </p>
                </div>
              </div>

              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full border border-secondary text-muted-foreground/80"
              >
                <Search className="size-4" />
              </span>
            </div>

            {/* Preview content */}
            <div className="p-4 sm:p-6">
              {/* Property image */}
              <div className="relative min-h-[150px] overflow-hidden rounded-2xl bg-accent sm:min-h-[218px]">
                <Image
                  src="/content.webp"
                  alt="content"
                  fill
                  sizes="(max-width: 640px) 100vw, 660px"
                  className="object-cover object-center"
                />

                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-[#14281d]/40 to-[#14281d]/0"
                />

                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/15 px-2.5 py-1 text-[10px] font-medium backdrop-blur-sm">
                    <MapPin className="size-3" />
                    Jakarta, Indonesia
                  </span>

                  <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                    Frisian Flag Indonesia
                  </p>

                  <p className="mt-0.5 text-xs text-white/75">
                    HSE Audit Assessment
                  </p>
                </div>

                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-brand-strong shadow-sm sm:right-4 sm:top-4 sm:text-xs">
                  PASS
                </span>
              </div>

              {/* Progress */}
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground/80">
                    Overall audit score
                  </p>

                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-semibold tracking-[-0.06em] text-secondary-foreground">
                      89%
                    </p>

                    <span className="text-xs font-semibold text-success">
                      PASS
                    </span>
                  </div>
                </div>

                <p className="text-right text-[11px] text-muted-foreground/80">
                  4 compliance areas
                </p>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-[89%] rounded-full bg-success" />
              </div>

              {/* Compliance results */}
              <div className="mt-5 divide-y divide-secondary">
                {inspections.map((item) => {
                  const isGood =
                    item.status === "Reviewed" ||
                    item.status === "Good" ||
                    item.status === "Very good";

                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`grid size-8 shrink-0 place-items-center rounded-xl ${
                            isGood
                              ? "bg-accent text-success"
                              : "bg-warning/15 text-warning"
                          }`}
                        >
                          {isGood ? (
                            <Check className="size-4" />
                          ) : (
                            <Clock3 className="size-4" />
                          )}
                        </span>

                        <span className="truncate text-xs font-semibold text-accent-foreground sm:text-sm">
                          {item.label}
                        </span>

                        <span className="hidden text-xs text-muted-foreground/80 sm:inline">
                          {item.count}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 text-[10px] font-medium sm:text-xs ${
                          isGood ? "text-success" : "text-warning"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom label */}
          <p
            id="workflow"
            className="mt-4 text-center text-[11px] font-medium tracking-wide text-muted-foreground/80"
          >
            ONE WORKSPACE · EVERY INSPECTION · CLEAR NEXT STEPS
          </p>
        </div>
      </section>
    </main>
  );
}

