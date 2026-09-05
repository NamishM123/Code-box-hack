"use client";
import { motion } from "framer-motion";

const ROOMS = [
  { img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=85&auto=format&fit=crop", title: "Warm Minimal Living", meta: "12′ × 14′ · $2,140" },
  { img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=85&auto=format&fit=crop", title: "Boho Studio Loft", meta: "18′ × 14′ · $1,620" },
  { img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=85&auto=format&fit=crop", title: "Japandi Bedroom", meta: "12′ × 11′ · $2,780" },
  { img: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=85&auto=format&fit=crop", title: "Scandi Reading Nook", meta: "8′ × 9′ · $980" }
];

export function Gallery() {
  return (
    <section className="border-t border-rule/40">
      <div className="mx-auto max-w-7xl px-6 py-28">
        <div className="mb-12 flex items-end justify-between">
          <div>
            <div className="pill">Explore demo rooms</div>
            <h2 className="font-display mt-5 text-5xl md:text-6xl">Rooms to begin with.</h2>
          </div>
          <div className="hidden text-sm text-ash md:block">Four editable demo scenarios for trying the workspace.</div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {ROOMS.map((r, i) => (
            <motion.a
              key={r.title}
              href="/canvas?demo=1"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="group relative block overflow-hidden rounded-xl border border-rule/40"
            >
              <img src={r.img} alt="" className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink via-ink/70 to-transparent p-4">
                <div className="font-display text-xl">{r.title}</div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-ash">{r.meta}</div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
