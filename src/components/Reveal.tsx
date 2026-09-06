"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Holds its children at rest until they are actually on screen, then lets the
 * page's one entrance play.
 *
 * The site already had a `.rise` animation, but it fired on load: anything
 * below the fold had finished animating long before anyone scrolled to it, so
 * every page past the first screen simply appeared. This runs the same
 * movement at the moment the section arrives.
 *
 * `once` is the default because a section that re-animates every time it
 * crosses the viewport reads as a glitch, not as polish.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
  once = true
}: {
  children: React.ReactNode;
  /** Seconds. Stagger siblings with 0.06 to 0.1 between them, no more. */
  delay?: number;
  as?: "div" | "section" | "article" | "li" | "figure";
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Anyone who has asked for less motion gets the final state immediately,
    // and no observer is created at all.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          if (once) io.disconnect();
        } else if (!once) {
          setShown(false);
        }
      },
      // Fires a little before the edge so the movement reads as the section
      // settling into place rather than catching up to the scroll.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${className}`}
      data-shown={shown ? "true" : "false"}
      style={delay ? ({ ["--delay" as string]: `${delay}s` }) : undefined}
    >
      {children}
    </Tag>
  );
}
