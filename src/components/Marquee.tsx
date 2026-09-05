"use client";
import { motion } from "framer-motion";

const SOURCES = ["Amazon", "Facebook Marketplace", "Target", "Wayfair", "IKEA", "West Elm", "CB2", "Article", "Pinterest"];

export function Marquee() {
  const items = [...SOURCES, ...SOURCES];
  return (
    <section className="border-y border-rule/40 bg-surface/60">
      <div className="scroll-fade overflow-hidden py-6">
        <motion.div
          className="flex gap-10 whitespace-nowrap font-display text-2xl text-ash"
          initial={{ x: 0 }}
          animate={{ x: "-50%" }}
          transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
        >
          {items.map((s, i) => (
            <span key={i} className="flex items-center gap-10">
              <span className="italic">{s}</span>
              <span className="text-brass/60">✦</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
