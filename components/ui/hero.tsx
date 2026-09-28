"use client";

import Image from "next/image";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { useCallback, useEffect, useRef, useState } from "react";
import SplashScreen from "@/components/ui/SplashScreen";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Layers3,
  MapPin,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };

const inspections = [
  {
    label: "General",
    count: "74%",
    status: "Reviewed",
  },
  {
    label: "HSE",
    count: "88%",
    status: "Good",
  },
  {
    label: "Food Safety",
    count: "0%",
    status: "Open findings",
  },
  {
    label: "EMS ",
    count: "97%",
    status: "Very good",
  },
];

export function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSplash, setShowSplash] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 16);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleGetStarted = () => {
    setShowSplash(true);

    setTimeout(() => {
      router.push("/login");
    }, 1600);
  };

  return (
    <>
      <SplashScreen show={showSplash} />
      <header className="fixed inset-x-0 top-0 z-[9999]">
        <div
          className={cn(
            "w-full border-x-0 border-t-0 border-b",
            "transition-[background-color,border-color,box-shadow,backdrop-filter]",
            "duration-300 ease-out",
            isScrolled
              ? [
                  "border-[#dfe7df]/90",
                  "bg-white/72",
                  "backdrop-blur-xl",
                  "shadow-[0_10px_35px_rgba(34,55,42,0.10)]",
                ]
              : [
                  "border-white/35",
                  "bg-white/30",
                  "backdrop-blur-md",
                  "shadow-[0_4px_18px_rgba(34,55,42,0.04)]",
                ],
          )}
        >
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-y-3 px-4 py-3 sm:px-6 sm:py-3.5 lg:px-7">
            {/* LOGO */}
            <a
              href="#top"
              aria-label="InspeXO home"
              className="group flex items-center gap-2.5"
            >
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11">
                <Image
                  src="/logoXO.webp"
                  alt="InspeXO logo"
                  width={48}
                  height={48}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="relative h-8 w-[112px] shrink-0 sm:h-9 sm:w-[126px]">
                <Image
                  src="/InspeXO.webp"
                  alt="InspeXO"
                  width={180}
                  height={52}
                  priority
                  className="h-full w-full object-contain object-left"
                />
              </div>
            </a>

            {/* DESKTOP NAVIGATION */}
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-8 text-sm font-medium text-[#64716a] md:flex"
            >
              <a
                href="#about"
                className="transition-colors hover:text-[#173d31]"
              >
                Our Platform
              </a>

              <a
                href="#description"
                className="transition-colors hover:text-[#173d31]"
              >
                How it works
              </a>

              <a href="#why" className="transition-colors hover:text-[#173d31]">
                Why InspeXO
              </a>
            </nav>

            {/* CTA */}
            <button
              type="button"
              onClick={handleGetStarted}
              className="order-2 inline-flex h-10 items-center gap-2 rounded-full bg-[#173d31] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#245442] sm:px-5 sm:text-sm"
            >
              Get started
              <ArrowUpRight className="size-4" />
            </button>

            {/* MOBILE NAVIGATION */}
            <nav
              aria-label="Mobile navigation"
              className="order-3 flex w-full basis-full items-center justify-between gap-2 border-t border-white/35 pt-3 text-xs font-medium text-[#64716a] md:hidden"
            >
              <a
                href="#about"
                className="whitespace-nowrap transition-colors hover:text-[#173d31]"
              >
                Our Platform
              </a>

              <a
                href="#description"
                className="whitespace-nowrap transition-colors hover:text-[#173d31]"
              >
                How it works
              </a>

              <a
                href="#why"
                className="whitespace-nowrap transition-colors hover:text-[#173d31]"
              >
                Why InspeXO
              </a>
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}

export function HeroSection() {
  return (
    <main
      id="top"
      className="relative isolate min-h-screen overflow-hidden bg-[#f7f8f5] text-[#19231f]"
    >
      {/* Background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_0%,rgba(189,220,198,0.42),transparent_48%)]"
      />
      {/* =========================
          HERO
      ========================== */}
      <section className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 pb-12 pt-8 sm:gap-12 sm:px-8 sm:pb-16 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10 lg:px-12 lg:pb-24 lg:pt-20">
        {/* =========================
            LEFT CONTENT
        ========================== */}
        <div className="relative z-10 mx-auto max-w-xl lg:mx-0">
          {/* Small badge */}
          <a
            href="#workflow"
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#d7e3d9] bg-white/80 py-1.5 pl-2 pr-3 text-xs font-medium text-[#506258] shadow-sm backdrop-blur-sm transition hover:border-[#a8c2ae] sm:text-sm"
          >
            <span className="grid size-6 place-items-center rounded-full bg-[#e8f2e9] text-[#36794e]">
              <Sparkles className="size-3.5" />
            </span>
            A clearer way to inspect
            <ArrowRight className="ml-0.5 size-3.5 text-[#36794e]" />
          </a>

          {/* Heading */}
          <h1 className="max-w-[12ch] text-balance text-[clamp(2.75rem,10.5vw,5.7rem)] font-semibold leading-[0.98] tracking-[-0.075em] text-[#17231d] sm:text-[clamp(3.25rem,7vw,5.7rem)]">
            See every detail.{" "}
            <span className="text-[#4f8560]">Move forward.</span>
          </h1>

          {/* Description */}
          <p className="mt-6 max-w-lg text-pretty text-base leading-7 text-[#68746d] sm:text-lg sm:leading-8">
            Inspections, findings, and reports in one calm, simple workspace.
            Give every site a clearer next step.
          </p>

          {/* CTA buttons */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#workspace"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#173d31] px-6 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(23,61,49,0.16)] transition hover:-translate-y-0.5 hover:bg-[#245442]"
            >
              Explore the workspace
              <ArrowRight className="size-4" />
            </a>

            <a
              href="#workflow"
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#d8dfd8] bg-white/70 px-6 text-sm font-semibold text-[#34463c] transition hover:border-[#a8b9ad] hover:bg-white"
            >
              See how it works
            </a>
          </div>

          {/* Feature highlights */}
          <div
            id="proof"
            className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-[#68746d] sm:text-sm"
          >
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#4f8560]" />
              Built for confident decisions
            </span>

            <span className="hidden h-4 border-l border-[#d6ded7] sm:block" />

            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4 text-[#4f8560]" />
              Less time chasing updates
            </span>
          </div>
        </div>

        {/* =========================
            RIGHT PREVIEW
        ========================== */}
        <div
          id="workspace"
          className="relative mx-auto w-full max-w-[660px] scroll-mt-32 lg:ml-auto"
        >
          {/* Glow */}
          <div
            aria-hidden="true"
            className="absolute -inset-8 -z-10 rounded-[3rem] bg-[#cfe1d1]/50 blur-3xl"
          />

          {/* Report ready floating card */}
          <div className="absolute -right-3 top-10 z-10 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/95 px-4 py-3 shadow-[0_14px_40px_rgba(34,55,42,0.12)] sm:flex lg:-right-6">
            <span className="grid size-8 place-items-center rounded-xl bg-[#e7f3e9] text-[#448158]">
              <Check className="size-4" />
            </span>

            <span>
              <span className="block text-xs font-semibold text-[#28382e]">
                Report ready
              </span>
              <span className="mt-0.5 block text-[11px] text-[#849087]">
                All findings organized
              </span>
            </span>
          </div>

          {/* Dashboard preview */}
          <div className="overflow-hidden rounded-[1.6rem] border border-[#dfe6df] bg-white shadow-[0_28px_80px_rgba(38,59,43,0.13)] sm:rounded-[2rem]">
            {/* Preview header */}
            <div className="flex items-center justify-between border-b border-[#edf0ec] px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-[#edf4ee] text-[#3c7550]">
                  <ClipboardCheck className="size-4" />
                </span>

                <div>
                  <p className="text-sm font-semibold tracking-tight text-[#25332a]">
                    HSE Audit Results
                  </p>

                  <p className="mt-0.5 text-[11px] text-[#909a92]">
                    Latest audit assessment
                  </p>
                </div>
              </div>

              <span
                aria-hidden="true"
                className="grid size-9 place-items-center rounded-full border border-[#e8ece8] text-[#738078]"
              >
                <Search className="size-4" />
              </span>
            </div>

            {/* Preview content */}
            <div className="p-4 sm:p-6">
              {/* Property image */}
              <div className="relative min-h-[150px] overflow-hidden rounded-2xl bg-[#dce8db] sm:min-h-[218px]">
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

                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-semibold text-[#39724d] shadow-sm sm:right-4 sm:top-4 sm:text-xs">
                  PASS
                </span>
              </div>

              {/* Progress */}
              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-[#879188]">
                    Overall audit score
                  </p>

                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-semibold tracking-[-0.06em] text-[#27362d]">
                      89%
                    </p>

                    <span className="text-xs font-semibold text-[#4b8359]">
                      PASS
                    </span>
                  </div>
                </div>

                <p className="text-right text-[11px] text-[#89948b]">
                  4 compliance areas
                </p>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#edf1ec]">
                <div className="h-full w-[89%] rounded-full bg-[#65966e]" />
              </div>

              {/* Compliance results */}
              <div className="mt-5 divide-y divide-[#edf0ec]">
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
                              ? "bg-[#edf5ed] text-[#4b8359]"
                              : "bg-[#f5f1e6] text-[#9a8147]"
                          }`}
                        >
                          {isGood ? (
                            <Check className="size-4" />
                          ) : (
                            <Clock3 className="size-4" />
                          )}
                        </span>

                        <span className="truncate text-xs font-semibold text-[#344238] sm:text-sm">
                          {item.label}
                        </span>

                        <span className="hidden text-xs text-[#a0a9a1] sm:inline">
                          {item.count}
                        </span>
                      </div>

                      <span
                        className={`shrink-0 text-[10px] font-medium sm:text-xs ${
                          isGood ? "text-[#5c8967]" : "text-[#a18c59]"
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
            className="mt-4 text-center text-[11px] font-medium tracking-wide text-[#8a968c]"
          >
            ONE WORKSPACE · EVERY INSPECTION · CLEAR NEXT STEPS
          </p>
        </div>
      </section>
    </main>
  );
}

const stories = [
  {
    id: "about",
    eyebrow: "01 / ABOUT INSPEXO",
    title: "Our Platform",
    description:
      "A single workspace for teams to plan inspections, capture findings, and understand what needs attention across every site.",
    icon: Layers3,
    points: [
      "Inspections in one place",
      "Clear ownership for every finding",
      "A live view across your operations",
    ],
  },
  {
    id: "description",
    eyebrow: "02 / THE PROCESS",
    title: "How It Works",
    description:
      "Move from observation to action with a straightforward flow that keeps field teams and decision-makers aligned.",
    icon: ClipboardCheck,
    points: [
      "Run consistent site checks",
      "Record evidence and actions",
      "Review progress and share reports",
    ],
  },
  {
    id: "why",
    eyebrow: "03 / WHY INSPEXO",
    title: "Why InspesXO",
    description:
      "Less time chasing updates means more time improving standards. InspeXO turns inspection data into practical next steps.",
    icon: ShieldCheck,
    points: [
      "See risks sooner",
      "Keep teams accountable",
      "Make confident decisions",
    ],
  },
];

export function InspexoTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const activeStory = stories[activeTab];
  const Icon = activeStory.icon;

  useEffect(() => {
    const syncTabFromHash = () => {
      const index = stories.findIndex(
        (story) => story.id === window.location.hash.slice(1),
      );
      if (index >= 0) setActiveTab(index);
    };
    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  return (
    <main className="bg-[#f7f8f5] text-[#19231f]">
      <section
        aria-label="About InspeXO"
        className="scroll-mt-8 border-t border-[#e5ebe4]"
      >
        <div className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#568061]">
              DISCOVER INSPEXO
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] text-[#17231d] sm:text-5xl">
              A clearer way to inspect
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-[#68746d]">
              Explore the platform, the process, and the difference it makes.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <div
              role="tablist"
              aria-label="Explore InspeXO"
              className="grid grid-cols-3 rounded-2xl border border-[#e1e8e1] bg-white/80 p-1.5 shadow-sm"
            >
              {stories.map((story, index) => (
                <button
                  key={story.id}
                  id={story.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === index}
                  aria-controls={`${story.id}-panel`}
                  tabIndex={activeTab === index ? 0 : -1}
                  onClick={() => setActiveTab(index)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "ArrowRight" ||
                      event.key === "ArrowLeft"
                    ) {
                      event.preventDefault();
                      const direction = event.key === "ArrowRight" ? 1 : -1;
                      const nextIndex =
                        (activeTab + direction + stories.length) %
                        stories.length;
                      setActiveTab(nextIndex);
                      document.getElementById(stories[nextIndex].id)?.focus();
                    }
                  }}
                  className={`rounded-xl px-2 py-3 text-xs font-semibold transition-colors duration-200 sm:px-4 sm:text-sm ${activeTab === index ? "bg-[#173d31] text-white shadow-[0_5px_16px_rgba(23,61,49,0.16)]" : "text-[#68746d] hover:bg-[#f0f5f0] hover:text-[#173d31]"}`}
                >
                  {story.title}
                </button>
              ))}
            </div>

            <div
              key={activeStory.id}
              id={`${activeStory.id}-panel`}
              role="tabpanel"
              aria-labelledby={activeStory.id}
              tabIndex={0}
              className="mt-5 rounded-[1.75rem] border border-[#e3eae2] bg-white p-6 shadow-[0_18px_60px_rgba(38,59,43,0.07)] animate-tab-enter sm:p-9"
            >
              <p className="text-xs font-semibold tracking-[0.16em] text-[#568061]">
                {activeStory.eyebrow}
              </p>
              <div className="mt-5 flex size-12 items-center justify-center rounded-2xl bg-[#e8f1e8] text-[#477653]">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[#17231d] sm:text-3xl">
                {activeStory.title}
              </h3>
              <p className="mt-3 max-w-2xl text-base leading-7 text-[#68746d] sm:text-lg sm:leading-8">
                {activeStory.description}
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-3">
                {activeStory.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2 rounded-2xl border border-[#e5ebe4] bg-[#fbfcfa] p-4 text-sm font-medium leading-6 text-[#34463c]"
                  >
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#568061]" />
                    {point}
                  </li>
                ))}
              </ul>
              {activeTab < stories.length - 1 && (
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab + 1)}
                  className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[#28533b] hover:text-[#4f8560]"
                >
                  Continue exploring <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

interface ScrollGlobeProps {
  sections: {
    id: string;
    badge?: string;
    title: string;
    subtitle?: string;
    description: string;
    align?: "left" | "center" | "right";
    features?: { title: string; description: string }[];
  }[];
  className?: string;
}

export function ScrollGlobe({ sections, className }: ScrollGlobeProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const frameRef = useRef<number | null>(null);
  const updateScrollPosition = useCallback(() => {
    const maxScroll =
      document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress(
      maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0,
    );
    const viewportCenter = window.innerHeight / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    sectionRefs.current.forEach((section, index) => {
      if (!section) return;
      const rect = section.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveSection(closestIndex);
  }, []);

useEffect(() => {
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;

    ticking = true;

    frameRef.current = window.requestAnimationFrame(() => {
      updateScrollPosition();
      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  frameRef.current = window.requestAnimationFrame(() => {
    updateScrollPosition();
    ticking = false;
  });

  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };
}, [updateScrollPosition]);

  if (sections.length === 0) return null;

  return (
    <div
      className={cn(
        "relative isolate w-full overflow-x-clip bg-[#f7f8f5] text-[#19231f]",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-50 h-0.5 bg-[#dce5dc]"
      >
        <div
          className="h-full origin-left bg-[#4f8560] transition-transform duration-150"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      <nav
        aria-label="Page sections"
        className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 sm:block lg:right-8"
      >
        <ol className="relative space-y-5 before:absolute before:bottom-1 before:left-1/2 before:top-1 before:-z-10 before:w-px before:-translate-x-1/2 before:bg-[#a9c2ad]/60">
          {sections.map((section, index) => (
            <li
              key={section.id}
              className="group relative flex items-center justify-end"
            >
              <span
                className={cn(
                  "pointer-events-none absolute right-7 whitespace-nowrap rounded-lg border border-[#e1e8e1] bg-white/95 px-3 py-2 text-xs font-medium text-[#34463c] opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                  activeSection === index && "opacity-100",
                )}
              >
                {section.badge ?? section.title}
              </span>
              <button
                type="button"
                aria-label={`Go to ${section.badge ?? section.title}`}
                aria-current={activeSection === index ? "location" : undefined}
                onClick={() =>
                  sectionRefs.current[index]?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                className={cn(
                  "size-3 rounded-full border-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#568061] focus-visible:ring-offset-2",
                  activeSection === index
                    ? "scale-110 border-[#39724d] bg-[#39724d]"
                    : "border-[#9aafa0] bg-[#f7f8f5] hover:border-[#39724d]",
                )}
              />
            </li>
          ))}
        </ol>
      </nav>

      {sections.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          ref={(element) => {
            sectionRefs.current[index] = element;
          }}
          aria-labelledby={`${section.id}-title`}
          className={cn(
            "relative z-20 flex min-h-[80vh] scroll-mt-32 flex-col justify-center overflow-hidden px-5 py-20 sm:min-h-screen sm:px-10 lg:px-16",
            section.align === "center"
              ? "items-center text-center"
              : section.align === "right"
                ? "items-end text-right"
                : "items-start text-left",
          )}
        >
          <div
            className={cn(
              "w-full max-w-2xl",
              section.align === "center" && "mx-auto",
              section.align === "right" && "ml-auto",
            )}
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-[#568061]">
              {section.badge}
            </p>
            <h2
              id={`${section.id}-title`}
              className="mt-4 text-balance text-4xl font-semibold leading-[1.04] tracking-[-0.065em] text-[#17231d] sm:text-5xl lg:text-6xl"
            >
              {section.title}
              {section.subtitle && (
                <span className="mt-2 block text-[#4f8560]">
                  {section.subtitle}
                </span>
              )}
            </h2>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-[#68746d] sm:text-lg sm:leading-8">
              {section.description}
            </p>
            {section.features && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {section.features.map((feature) => (
                  <article
                    key={feature.title}
                    className="rounded-2xl border border-[#e1e8e1] bg-white/85 p-4 text-left shadow-sm backdrop-blur-sm sm:p-5"
                  >
                    <h3 className="font-semibold text-[#2d4937]">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-[#68746d]">
                      {feature.description}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

export function GlobeScrollDemo() {
  return (
    <ScrollGlobe
      sections={[
        {
          id: "about",
          badge: "OUR PLATFORM",
          title: "Every inspection,",
          subtitle: "one clear view.",
          description:
            "InspeXO brings inspections, findings, and reports together so teams can see what needs attention across every site.",
          align: "left",
          features: [
            {
              title: "One workspace",
              description: "Keep site checks, evidence, and findings together.",
            },
            {
              title: "Clear ownership",
              description:
                "Give every action a responsible owner and next step.",
            },
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
            {
              title: "Inspect",
              description: "Run consistent checks at every location.",
            },
            {
              title: "Resolve",
              description: "Record findings, evidence, and follow-up actions.",
            },
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
            {
              title: "Know what matters",
              description: "Spot open risks and progress in one place.",
            },
            {
              title: "Make the next step clear",
              description: "Turn inspection results into practical action.",
            },
          ],
        },
      ]}
    />
  );
}
