"use client";
import { motion } from "framer-motion";

const ROOMS = [
  { img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80&auto=format&fit=crop", title: "Warm Minimal Living", price: "$2,140" },
  { img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80&auto=format&fit=crop", title: "Boho Studio Loft", price: "$1,620" },
  { img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=800&q=80&auto=format&fit=crop", title: "Japandi Bedroom", price: "$2,780" },
  { img: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&q=80&auto=format&fit=crop", title: "Scandi Reading Nook", price: "$980" }
];

export function Gallery() {
  return (
    <section id="sources" className="mx-auto max-w-7xl px-6 py-24">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <div className="pill">Inspiration</div>
          <h2 className="font-display mt-4 text-4xl md:text-5xl">Rooms built by Roomly</h2>
        </div>
        <div className="hidden text-sm text-black/60 md:block">Each room links to a shoppable board.</div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {ROOMS.map((r, i) => (
          <motion.a
            key={r.title}
            href="/design"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="group relative block overflow-hidden rounded-2xl"
          >
            <img src={r.img} alt="" className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-105" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 text-cream">
              <div className="font-display text-xl">{r.title}</div>
              <div className="text-xs opacity-80">Total {r.price}</div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
