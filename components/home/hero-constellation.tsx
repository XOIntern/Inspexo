"use client";

import { useEffect, useRef } from "react";
import {
  Activity,
  AlertTriangle,
  Bell,
  Calendar,
  ClipboardCheck,
  Clock,
  FileCheck,
  HardHat,
  Radio,
  Search,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

interface Node {
  icon: LucideIcon;
  /** Position in % of the section. */
  x: number;
  y: number;
  /** Tailwind text color class. */
  color: string;
  size: number;
  /** Parallax depth: how far the node drifts toward the pointer, in px. */
  depth: number;
  duration: number;
  delay: number;
}

const NODES: Node[] = [
  { icon: ShieldCheck, x: 8, y: 22, color: "text-emerald-600/60", size: 28, depth: 14, duration: 7, delay: 0 },
  { icon: ClipboardCheck, x: 26, y: 8, color: "text-emerald-500/45", size: 20, depth: 22, duration: 8, delay: 1.2 },
  { icon: Bell, x: 15, y: 48, color: "text-rose-500/55", size: 24, depth: 18, duration: 6.5, delay: 0.6 },
  { icon: HardHat, x: 42, y: 14, color: "text-slate-400/60", size: 32, depth: 10, duration: 7.5, delay: 2 },
  { icon: AlertTriangle, x: 44, y: 38, color: "text-sky-500/55", size: 34, depth: 26, duration: 6, delay: 0.3 },
  { icon: Clock, x: 45, y: 62, color: "text-rose-400/50", size: 20, depth: 20, duration: 8, delay: 1.6 },
  { icon: FileCheck, x: 50, y: 76, color: "text-slate-400/55", size: 18, depth: 28, duration: 7, delay: 0.9 },
  { icon: Calendar, x: 24, y: 78, color: "text-violet-500/55", size: 22, depth: 24, duration: 7.2, delay: 1.4 },
  { icon: Search, x: 6, y: 88, color: "text-amber-500/60", size: 26, depth: 16, duration: 6.8, delay: 0.4 },
  { icon: Wrench, x: 28, y: 92, color: "text-amber-500/55", size: 24, depth: 30, duration: 7.8, delay: 2.2 },
  { icon: Bell, x: 74, y: 28, color: "text-amber-500/55", size: 22, depth: 20, duration: 6.4, delay: 1 },
  { icon: Activity, x: 80, y: 52, color: "text-emerald-500/55", size: 22, depth: 24, duration: 7.4, delay: 1.8 },
  { icon: Radio, x: 94, y: 12, color: "text-emerald-500/50", size: 22, depth: 18, duration: 8.2, delay: 0.7 },
  { icon: Clock, x: 92, y: 72, color: "text-amber-400/50", size: 18, depth: 26, duration: 6.6, delay: 1.1 },
  { icon: Bell, x: 60, y: 94, color: "text-sky-400/50", size: 18, depth: 30, duration: 7.6, delay: 2.6 },
];

/* Line endpoints reference NODES indices; drawn in a 100x100 viewBox with
   preserveAspectRatio="none" so coordinates align with the % positions. */
const EDGES: Array<[number, number]> = [
  [0, 2],
  [2, 4],
  [1, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 8],
  [8, 9],
  [7, 9],
  [10, 11],
  [11, 13],
  [6, 14],
  [4, 10],
  [2, 7],
];

export function HeroConstellation() {
  const ref = useRef<HTMLDivElement>(null);

  /* Pointer parallax: lerp the whole layer (and each node by its depth)
     toward the pointer with rAF. Transform-only; disabled for reduced
     motion and coarse pointers (touch). */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof window.matchMedia !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !window.matchMedia("(pointer: fine)").matches
    ) {
      return;
    }

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;

    const nodeEls = el.querySelectorAll<HTMLElement>("[data-depth]");
    const onMove = (e: PointerEvent) => {
      tx = e.clientX / window.innerWidth - 0.5;
      ty = e.clientY / window.innerHeight - 0.5;
    };

    const tick = () => {
      x += (tx - x) * 0.06;
      y += (ty - y) * 0.06;
      el.style.transform = `translate3d(${x * -18}px, ${y * -12}px, 0)`;
      for (let i = 0; i < nodeEls.length; i++) {
        const n = nodeEls[i];
        const d = Number(n.dataset.depth);
        n.style.translate = `${x * d}px ${y * d}px`;
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 hidden will-change-transform md:block"
    >
      {/* Soft color blobs for depth. */}
      <div className="hero-float-slow absolute left-[10%] top-[30%] size-72 rounded-full bg-emerald-300/25 blur-3xl" />
      <div className="hero-float-slow absolute right-[15%] top-[55%] size-64 rounded-full bg-sky-300/20 blur-3xl [animation-delay:-4s]" />

      <svg
        className="edge-flow absolute inset-0 size-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {EDGES.map(([a, b]) => (
          <line
            key={`${a}-${b}`}
            x1={NODES[a].x}
            y1={NODES[a].y}
            x2={NODES[b].x}
            y2={NODES[b].y}
            className="stroke-foreground/12"
            strokeWidth={1}
            pathLength={1}
            strokeDasharray="0.06 0.05"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {NODES.map(({ icon: Icon, x, y, color, size, depth, duration, delay }, i) => (
        <div
          key={i}
          data-depth={depth}
          className="hero-drift absolute will-change-transform"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            animationDuration: `${duration}s`,
            animationDelay: `-${delay}s`,
          }}
        >
          <div
            className="hero-pop"
            style={{ animationDelay: `${0.2 + i * 0.09}s` }}
          >
            <Icon
              style={{ width: size, height: size }}
              className={color}
              strokeWidth={1.5}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
