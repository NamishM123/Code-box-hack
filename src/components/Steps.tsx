"use client";
import { motion } from "framer-motion";
import { Camera, ScanSearch, Palette, Move3d, Sparkles } from "lucide-react";

const STEPS = [
  { icon: Camera, num: "01", title: "Frame the room", body: "Choose room type and goal. We tell you what to photograph and why." },
  { icon: ScanSearch, num: "02", title: "Capture", body: "6-12 clear photos. Real-time quality and coverage checks catch bad frames." },
  { icon: Palette, num: "03", title: "Vibe", body: "Set a budget, drop a Pinterest link, or upload inspiration. We read the palette and mood." },
  { icon: Move3d, num: "04", title: "Explore", body: "Three principled layouts. Swap any piece and see the fit rationale in your room." },
  { icon: Sparkles, num: "05", title: "Refine", body: "Aesthetic suggestions rooted in architectural literature and feng shui." }
];

export function Steps() {
  return (
    <section id="how" className="mx-auto max-w-7xl px-6 py-28">
      <div className="mb-14 flex items-end justify-between">
        <div>
          <div className="pill">The method</div>
          <h2 className="font-display mt-5 max-w-2xl text-5xl md:text-6xl">Five moves between a photo and a decision.</h2>
        </div>
        <div className="hidden max-w-xs text-sm text-ash md:block">Every step is inspectable. Nothing about your room is a black box.</div>
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-rule/40 bg-rule/40 md:grid-cols-5">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            className="bg-ink p-6"
          >
            <div className="flex items-center justify-between">
              <s.icon className="h-5 w-5 text-brass" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-ash">{s.num}</span>
            </div>
            <div className="mt-6 font-display text-2xl leading-tight">{s.title}</div>
            <p className="mt-2 text-[13px] leading-relaxed text-ash">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
