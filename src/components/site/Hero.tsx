"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Glyph, type GlyphName } from "./Glyphs";

/**
 * The hero cluster: real furniture hung as charms off a single ring. Everything
 * swings on its own cord, and the whole bundle leans toward the pointer.
 */
const CHARMS: {
  name: GlyphName;
  label: string;
  x: number;
  cord: number;
  size: number;
  tilt: number;
  swing: number;
  duration: number;
  bg: string;
  fg: string;
}[] = [
  { name: "sofa", label: "Sofa", x: -168, cord: 92, size: 94, tilt: -7, swing: 4.5, duration: 5.2, bg: "linear-gradient(150deg,#FF7A3D,#E8410F)", fg: "#FFF6F0" },
  { name: "lamp", label: "Floor lamp", x: -102, cord: 148, size: 78, tilt: 5, swing: 6, duration: 4.1, bg: "linear-gradient(150deg,#4B76FF,#1E3ACF)", fg: "#F1F4FF" },
  { name: "table", label: "Coffee table", x: -34, cord: 108, size: 86, tilt: -3, swing: 3.6, duration: 6.3, bg: "linear-gradient(150deg,#FFD36B,#EDA51F)", fg: "#3A2405" },
  { name: "tv", label: "Television", x: 36, cord: 166, size: 90, tilt: 6, swing: 5.2, duration: 4.8, bg: "linear-gradient(150deg,#2B2B31,#0C0C0D)", fg: "#F2F1EE" },
  { name: "chair", label: "Lounge chair", x: 104, cord: 118, size: 80, tilt: -6, swing: 4.2, duration: 5.7, bg: "linear-gradient(150deg,#6FA97F,#33654A)", fg: "#F0FAF2" },
  { name: "rug", label: "Area rug", x: 172, cord: 84, size: 88, tilt: 4, swing: 5.8, duration: 4.4, bg: "linear-gradient(150deg,#9B6BFF,#5B2FD1)", fg: "#F5F0FF" }
];

export function Hero() {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotate = useSpring(useTransform(px, [-1, 1], [6, -6]), { stiffness: 60, damping: 18 });
  const shiftX = useSpring(useTransform(px, [-1, 1], [-14, 14]), { stiffness: 60, damping: 18 });
  const shiftY = useSpring(useTransform(py, [-1, 1], [-8, 8]), { stiffness: 60, damping: 18 });

  const [scale, setScale] = useState(1);
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setScale(w < 480 ? 0.52 : w < 768 ? 0.68 : w < 1100 ? 0.86 : 1);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth) * 2 - 1);
      py.set((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [px, py]);

  return (
    <section className="relative overflow-hidden px-5 pb-10 pt-24 md:pb-16 md:pt-28">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(58%_60%_at_50%_0%,rgba(255,255,255,0.9),transparent_70%)]" />

      {/* ---------------------------------------------------- charm cluster */}
      <div className="relative mx-auto h-[186px] w-full max-w-[820px] sm:h-[236px] md:h-[300px] lg:h-[340px]">
        <motion.div
          style={{ rotate, x: shiftX, y: shiftY, scale }}
          className="absolute left-1/2 top-2 origin-top"
        >
          <Ring />
          {CHARMS.map((c, i) => (
            /* the positioner stays put; only the inner element carries the swing,
               since a CSS animation transform would otherwise eat the offset */
            <div
              key={c.name}
              className="absolute left-0 top-[26px]"
              style={{ transform: `translateX(${c.x}px)`, zIndex: 10 + i }}
            >
            <div
              className="charm flex flex-col items-center"
              style={
                {
                  ["--swing" as string]: `${c.swing}deg`,
                  ["--swing-duration" as string]: `${c.duration}s`,
                  animationDelay: `${i * -0.7}s`
                } as React.CSSProperties
              }
            >
              <span className="block h-2.5 w-2.5 -translate-y-1 rounded-full border-[2px] border-ink/45" />
              <span className="block w-[2px] bg-gradient-to-b from-ink/35 to-ink/20" style={{ height: c.cord }} />
              <motion.span
                whileHover={{ scale: 1.08, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                className="group relative grid place-items-center rounded-[22px] shadow-[0_18px_30px_-16px_rgba(12,12,13,0.75)] ring-1 ring-black/10"
                style={{
                  width: c.size,
                  height: c.size,
                  background: c.bg,
                  color: c.fg,
                  rotate: `${c.tilt}deg`
                }}
              >
                <span className="absolute inset-x-0 top-0 h-1/2 rounded-t-[22px] bg-gradient-to-b from-white/25 to-transparent" />
                <Glyph name={c.name} className="relative h-1/2 w-1/2" strokeWidth={1.4} />
                <span className="pointer-events-none absolute -bottom-7 whitespace-nowrap rounded-full bg-ink px-2 py-1 text-[10px] font-medium text-paper opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                  {c.label}
                </span>
              </motion.span>
            </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* --------------------------------------------------------- headline */}
      <div className="relative mx-auto max-w-[1400px] text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          className="display-xl mx-auto text-[clamp(44px,8.4vw,136px)]"
        >
          Engineered for Living
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="mx-auto mt-6 max-w-lg text-[15px] leading-relaxed text-ash md:text-base"
        >
          Explore the first room editor you can furnish from. Photograph a space, place
          pieces measured to fit, buy them wherever they cost least.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
        >
          <Link href="/capture" className="btn btn-primary group px-6 py-3.5">
            Map your room free
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <Link href="/canvas?demo=1" className="btn btn-light px-6 py-3.5">
            See a finished room
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-5 text-[12px] text-ash"
        >
          No credit card. No measuring tape. Six photos is enough.
        </motion.div>
      </div>
    </section>
  );
}

function Ring() {
  return (
    <svg viewBox="0 0 460 60" className="absolute left-1/2 top-[-18px] h-[62px] w-[476px] -translate-x-1/2" aria-hidden="true">
      <defs>
        <linearGradient id="chromeRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F7F7F5" />
          <stop offset="28%" stopColor="#9C9C9A" />
          <stop offset="52%" stopColor="#F2F1EE" />
          <stop offset="76%" stopColor="#7C7C7A" />
          <stop offset="100%" stopColor="#DEDCD7" />
        </linearGradient>
      </defs>
      <rect x="12" y="30" width="436" height="16" rx="8" fill="none" stroke="url(#chromeRing)" strokeWidth="6" />
      <rect x="212" y="6" width="36" height="30" rx="12" fill="none" stroke="url(#chromeRing)" strokeWidth="6" />
    </svg>
  );
}
