"use client";

import { useEffect, useRef, type ElementRef } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /* Stagger delay in ms, used when several items reveal together. */
  delay?: number;
}

/* Adds .is-visible once the element scrolls into view. Pure CSS transition
   in globals.css; reduced motion collapses the whole effect. */
export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const ref = useRef<ElementRef<"div">>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const noObserver = typeof IntersectionObserver === "undefined";

    if (reduceMotion || noObserver) {
      el.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
