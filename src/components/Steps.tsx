"use client";
import { motion } from "framer-motion";
import { Ruler, Wallet, Wand2, Move3d } from "lucide-react";

const STEPS = [
  { icon: Ruler, title: "Measure your room", body: "Tell us the dimensions and what you already own." },
  { icon: Wallet, title: "Set your budget", body: "We match your total spend across every retailer we search." },
  { icon: Wand2, title: "Get curated finds", body: "One-click picks from Amazon, Facebook, Target, Wayfair, IKEA." },
  { icon: Move3d, title: "Rearrange in 3D", body: "See the room from any angle. Swap pieces. Save the layout." }
];

export function Steps() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-12 flex items-end justify-between">
        <div>
          <div className="pill">How it works</div>
          <h2 className="font-display mt-4 text-4xl md:text-5xl">Four steps to a finished room</h2>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-4">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="card p-5"
          >
            <s.icon className="h-5 w-5 text-clay" />
            <div className="mt-4 text-xs uppercase tracking-widest text-black/50">Step 0{i + 1}</div>
            <div className="font-display text-2xl">{s.title}</div>
            <p className="mt-2 text-sm text-black/70">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
