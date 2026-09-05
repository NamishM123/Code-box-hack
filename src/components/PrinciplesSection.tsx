"use client";
import { motion } from "framer-motion";
import { PRINCIPLES } from "@/lib/principles";

const featured = PRINCIPLES.filter((p) => ["command-position", "light-two-sides", "intimacy-gradient", "conversation-radius", "rug-anchors", "walkway"].includes(p.key));

export function PrinciplesSection() {
  return (
    <section id="principles" className="mx-auto max-w-7xl px-6 py-28">
      <div className="mb-14 grid gap-8 md:grid-cols-[1fr_2fr]">
        <div>
          <div className="pill">The library</div>
          <h2 className="font-display mt-5 text-5xl md:text-6xl leading-[0.95]">Principles<br /><span className="italic text-brass">we place with.</span></h2>
        </div>
        <p className="max-w-2xl text-[15px] leading-relaxed text-ash md:pt-16">
          Every layout Sightline generates is auditable back to a rule. We draw from Christopher Alexander&apos;s
          <em> A Pattern Language</em>, Ching&apos;s <em>Form, Space, and Order</em>, ergonomic clearances from
          <em> Human Dimension &amp; Interior Space</em>, and classical feng shui bagua and command mappings. Not
          quoted, encoded — as functions that decide where a piece goes and refuse where it cannot.
        </p>
      </div>
      <div className="grid gap-px overflow-hidden rounded-xl border border-rule/40 bg-rule/40 md:grid-cols-3">
        {featured.map((p, i) => (
          <motion.div
            key={p.key}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.04 }}
            className="group bg-ink p-6"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.2em] text-brass">{p.tradition}</span>
              <span className="font-mono text-[10px] text-ash">§ {String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="mt-4 font-display text-2xl leading-tight">{p.title}</div>
            <p className="mt-3 text-[13px] leading-relaxed text-ash">{p.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
