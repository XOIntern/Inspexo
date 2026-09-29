"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollSectionLink {
  id: string;
  badge?: string;
  title: string;
}

interface ScrollGlobeClientProps {
  sections: ScrollSectionLink[];
  children: ReactNode;
}

export default function ScrollGlobeClient({
  sections,
  children,
}: ScrollGlobeClientProps) {
  const [activeSection, setActiveSection] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const frameRef = useRef<number | null>(null);

  const updateScrollPosition = useCallback(() => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    setScrollProgress(maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0);

    const viewportCenter = window.innerHeight / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    sections.forEach((section, index) => {
      const element = document.getElementById(section.id);
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const distance = Math.abs(rect.top + rect.height / 2 - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveSection(closestIndex);
  }, [sections]);

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
    <div className="relative isolate w-full overflow-x-clip bg-background text-foreground">
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-[var(--z-progress)] h-0.5 bg-border"
      >
        <div
          className="h-full origin-left bg-brand transition-transform duration-150"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      <nav
        aria-label="Page sections"
        className="fixed right-5 top-1/2 z-[var(--z-section-nav)] hidden -translate-y-1/2 sm:block lg:right-8"
      >
        <ol className="relative space-y-5 before:absolute before:bottom-1 before:left-1/2 before:top-1 before:-z-10 before:w-px before:-translate-x-1/2 before:bg-muted-foreground/60">
          {sections.map((section, index) => (
            <li
              key={section.id}
              className="group relative flex items-center justify-end"
            >
              <span
                className={cn(
                  "pointer-events-none absolute right-7 whitespace-nowrap rounded-lg border border-border bg-white/95 px-3 py-2 text-xs font-medium text-accent-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
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
                  document.getElementById(section.id)?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  })
                }
                className={cn(
                  "size-3 rounded-full border-2 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  activeSection === index
                    ? "scale-110 border-brand-strong bg-brand-strong"
                    : "border-muted-foreground/60 bg-background hover:border-brand-strong",
                )}
              />
            </li>
          ))}
        </ol>
      </nav>
      {children}
    </div>
  );
}
