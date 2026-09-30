"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import SplashScreen from "@/components/splash-screen";

const navLinks = [
  { href: "#features", label: "Platform" },
  { href: "#how-it-works", label: "How it works" },
];

export function Header() {
  const [showSplash, setShowSplash] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
    setIsMenuOpen(false);
    setShowSplash(true);

    navigationTimer.current = setTimeout(() => {
      setShowSplash(false);

      navigationTimer.current = setTimeout(() => {
        navigationTimer.current = null;
        router.push("/auth/login");
      }, 900);
    }, 1600);
  };

  const handleNavClick = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <SplashScreen show={showSplash} />

      <header className="fixed inset-x-0 top-0 z-(--z-header)">
        <div className="w-full border-b border-border bg-card/70 shadow-[0_10px_35px_rgba(34,55,42,0.06)] backdrop-blur-xl">
          <div className="container relative flex w-full items-center justify-between py-3 sm:py-3.5">
            {/* Logo */}
            <a
              href="#top"
              aria-label="InspeXO home"
              className="flex items-center"
            >
              <Image
                src="/logoXO.webp"
                alt="InspeXO logo"
                width={88}
                height={47}
                priority
                className="h-auto w-10 sm:w-11"
              />
            </a>

            {/* Desktop Navigation */}
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-8 text-sm font-medium text-muted-foreground lg:flex"
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

            {/* Desktop Sign In */}
            <button
              type="button"
              onClick={handleGetStarted}
              disabled={isTransitioning}
              className="hidden h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-sm lg:inline-flex"
            >
              Sign In
              <ArrowUpRight className="size-4" strokeWidth={2} />
            </button>

            {/* Mobile / Tablet Hamburger */}
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background/60 text-foreground transition hover:bg-background lg:hidden"
            >
              {isMenuOpen ? (
                <X className="size-5" strokeWidth={2} />
              ) : (
                <Menu className="size-5" strokeWidth={2} />
              )}
            </button>

            {/* Mobile / Tablet Menu */}
            {isMenuOpen && (
              <div className="absolute inset-x-0 top-full border-b border-border bg-card/95 shadow-[0_12px_35px_rgba(34,55,42,0.08)] backdrop-blur-xl lg:hidden">
                <nav
                  aria-label="Mobile navigation"
                  className="container flex flex-col gap-1 py-4"
                >
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={handleNavClick}
                      className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                    >
                      {link.label}
                    </a>
                  ))}

                  {/* Sign In moved inside hamburger menu */}
                  <button
                    type="button"
                    onClick={handleGetStarted}
                    disabled={isTransitioning}
                    className="mt-2 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
                  >
                    Sign In
                    <ArrowUpRight className="size-4" strokeWidth={2} />
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}