"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import SplashScreen from "@/components/splash-screen";

export function Header() {
  const [showSplash, setShowSplash] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionStarted = useRef(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (navigationTimer.current !== null) {
        clearTimeout(navigationTimer.current);
      }
    };
  }, []);

  const handleGetStarted = () => {
    if (transitionStarted.current) return;

    transitionStarted.current = true;
    setIsTransitioning(true);
    setShowSplash(true);
    navigationTimer.current = setTimeout(() => {
      setShowSplash(false);
      navigationTimer.current = setTimeout(() => {
        navigationTimer.current = null;
        router.push("/auth/login");
      }, 900);
    }, 1600);
  };

  return (
    <>
      <SplashScreen show={showSplash} />
      <header className="fixed inset-x-0 top-0 z-(--z-header)">
        <div
          className={cn(
            "w-full border-x-0 border-t-0 border-b",
            "transition-[background-color,border-color,box-shadow,backdrop-filter]",
            "duration-300 ease-out",
            "border-border/90",
            "bg-white/72",
            "backdrop-blur-xl",
            "shadow-[0_10px_35px_rgba(34,55,42,0.10)]",
          )}
        >
          <div className="container flex w-full flex-wrap items-center justify-between gap-y-3 py-3 sm:py-3.5">
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
            </a>

            {/* DESKTOP NAVIGATION */}
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex"
            >
              <a
                href="#about"
                className="transition-colors hover:text-primary"
              >
                Our Platform
              </a>

              <a
                href="#description"
                className="transition-colors hover:text-primary"
              >
                How it works
              </a>

              <a href="#why" className="transition-colors hover:text-primary">
                Why InspeXO
              </a>
            </nav>

            {/* CTA */}
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={isTransitioning}
              className="order-2 inline-flex h-10 items-center gap-2 rounded-full bg-primary px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-sm"
            >
              Sign in
              <ArrowUpRight className="size-4" />
            </button>

            {/* MOBILE NAVIGATION */}
            <nav
              aria-label="Mobile navigation"
              className="order-3 flex w-full basis-full items-center justify-between gap-2 border-t border-white/35 pt-3 text-xs font-medium text-muted-foreground md:hidden"
            >
              <a
                href="#about"
                className="whitespace-nowrap transition-colors hover:text-primary"
              >
                Our Platform
              </a>

              <a
                href="#description"
                className="whitespace-nowrap transition-colors hover:text-primary"
              >
                How it works
              </a>

              <a
                href="#why"
                className="whitespace-nowrap transition-colors hover:text-primary"
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

