"use client";
import { motion } from "framer-motion";

const SOURCES = ["Amazon", "Facebook Marketplace", "Target", "Wayfair", "IKEA", "West Elm", "CB2", "Article"];

export function Marquee() {
  const items = [...SOURCES, ...SOURCES];
  return (
    <div className="scroll-fade overflow-hidden py-8">
      <motion.div
        className="flex gap-10 whitespace-nowrap text-2xl font-display text-black/50"
        initial={{ x: 0 }}
        animate={{ x: "-50%" }}
        transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
      >
        {items.map((s, i) => (
          <span key={i} className="flex items-center gap-10">
            {s}
            <span className="text-black/20">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
