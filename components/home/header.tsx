"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import SplashScreen from "@/components/splash-screen";

const navLinks = [
  { href: "#features", label: "Platform" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#use-cases", label: "Industries" },
];

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
        <div className="w-full border-b border-border bg-card/70 shadow-[0_10px_35px_rgba(34,55,42,0.06)] backdrop-blur-xl">
          <div className="container flex w-full flex-wrap items-center justify-between gap-y-3 py-3 sm:py-3.5">
            {/* Logo */}
            <a
              href="#top"
              aria-label="InspeXO home"
              className="flex items-center gap-2.5"
            >
              <Image
                src="/logoXO.webp"
                alt="InspeXO logo"
                width={44}
                height={20}
                priority
                className="w-10 sm:w-11"
              />
            </a>

            {/* Desktop navigation */}
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Sign in: splash flow kept for the integration test */}
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={isTransitioning}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-sm"
            >
              Sign in
              <ArrowUpRight className="size-4" strokeWidth={2} />
            </button>

            {/* Mobile navigation */}
            <nav
              aria-label="Mobile navigation"
              className="order-3 flex w-full basis-full items-center justify-between gap-2 border-t border-border px-1 pt-3 pb-1 text-xs font-medium text-muted-foreground md:hidden"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="whitespace-nowrap transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </header>
    </>
  );
}
