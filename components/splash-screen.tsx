

import Image from "next/image";

interface SplashScreenProps {
  show: boolean;
}

export default function SplashScreen({ show }: SplashScreenProps) {
  return (
    <div
      className={`fixed inset-0 z-[var(--z-overlay)] flex items-center justify-center overflow-hidden bg-[#f7f8f5] transition-all duration-500 ${
        show
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    >
      {/* Soft background glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(189,220,198,0.45),transparent_55%)]"
      />

      {/* Secondary glow */}
      <div
        aria-hidden="true"
        className="absolute h-72 w-72 rounded-full bg-[#4f8560]/10 blur-3xl"
      />

      {/* XO Logo */}
      <div
        className={`relative z-10 transform transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          show
            ? "scale-100 opacity-100 blur-0"
            : "scale-75 opacity-0 blur-md"
        }`}
      >
        <div className="relative h-28 w-28 sm:h-36 sm:w-36">
          <Image
            src="/logoXO.webp"
            alt="InspeXO"
            fill
            sizes="(max-width: 640px) 112px, 144px"
            priority
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}
