"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import SplashScreen from "@/components/splash-screen";

const navLinks = [
  { href: "#problem", label: "Problem" },
  { href: "#solution", label: "Solution" },
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#benefits", label: "Benefits" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  const [showSplash, setShowSplash] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const transitionStarted = useRef(false);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuToggleRef = useRef<HTMLButtonElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  const router = useRouter();

  useEffect(() => {
    return () => {
      if (navigationTimer.current !== null) {
        clearTimeout(navigationTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuToggleRef.current?.focus();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const desktopQuery = window.matchMedia("(min-width: 1024px)");

    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        setIsMenuOpen(false);
      }
    };

    desktopQuery.addEventListener("change", handleDesktopChange);
    return () => {
      desktopQuery.removeEventListener("change", handleDesktopChange);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scrollspy: highlight the nav link of the section crossing the viewport
  // band just below the fixed header.
  useEffect(() => {
    if (typeof window.IntersectionObserver !== "function") return;

    const sections = navLinks
      .map((link) => document.getElementById(link.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      // Narrow band ~header height below the top so a section counts as
      // active as soon as it scrolls under the nav.
      { rootMargin: "0px 0px -80% 0px" },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const handleGetStarted = () => {
    if (transitionStarted.current) return;

    transitionStarted.current = true;
    setIsTransitioning(true);
    setIsMenuOpen(false);
    setShowSplash(true);

      navigationTimer.current = setTimeout(() => {
        navigationTimer.current = null;
        router.push("/auth/login");
      }, 900);
  };

  const handleNavClick = () => {
    setIsMenuOpen(false);
    menuToggleRef.current?.focus();
  };

  return (
    <>
      <SplashScreen show={showSplash} />

      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-(--z-header)"
      >
        <div
          className={`w-full transition-all duration-300 ${
            isScrolled
              ? "border-b border-border bg-card/70 shadow-[0_10px_35px_rgba(34,55,42,0.06)] backdrop-blur-xl"
              : "border-b border-transparent bg-transparent"
          }`}
        >
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
                  className={`transition-colors hover:text-primary ${
                    activeSection === link.href.slice(1) ? "text-primary" : ""
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {/* Desktop Sign In — hidden while the mobile menu is open so only
                one "Sign In" button exists in the DOM at any time */}
            {!isMenuOpen && (
              <button
                type="button"
                onClick={handleGetStarted}
                disabled={isTransitioning}
                className="hidden h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70 sm:px-5 sm:text-sm lg:inline-flex"
              >
                Sign In
                <ArrowUpRight className="size-4" strokeWidth={2} />
              </button>
            )}

            {/* Mobile / Tablet Hamburger */}
            <button
              ref={menuToggleRef}
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
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
              <div
                id="mobile-menu"
                className="absolute inset-x-0 top-full border-b border-border bg-card/95 shadow-[0_12px_35px_rgba(34,55,42,0.08)] backdrop-blur-xl lg:hidden"
              >
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
