"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import SplashScreen from "@/components/ui/SplashScreen";
import LoginPageSkeleton from "@/components/login-page-skeleton";

export function SiteHeader() {
  const [showSplash, setShowSplash] = useState(false);
  const [showLoginSkeleton, setShowLoginSkeleton] = useState(false);
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
      setShowLoginSkeleton(true);
      navigationTimer.current = setTimeout(() => {
        navigationTimer.current = null;
        router.push("/login");
      }, 900);
    }, 1600);
  };

  return (
    <>
      <SplashScreen show={showSplash} />
      {showLoginSkeleton && <LoginPageSkeleton />}
      <header className="fixed inset-x-0 top-0 z-[var(--z-header)]">
        <div
          className={cn(
            "w-full border-x-0 border-t-0 border-b",
            "transition-[background-color,border-color,box-shadow,backdrop-filter]",
            "duration-300 ease-out",
            "border-[#dfe7df]/90",
            "bg-white/72",
            "backdrop-blur-xl",
            "shadow-[0_10px_35px_rgba(34,55,42,0.10)]",
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
              disabled={isTransitioning}
              className="order-2 inline-flex h-10 items-center gap-2 rounded-full bg-[#173d31] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#245442] disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-sm"
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

