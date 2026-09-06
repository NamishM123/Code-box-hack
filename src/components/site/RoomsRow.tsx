"use client";
import { motion } from "framer-motion";
import { Glyph, type GlyphName } from "./Glyphs";

const ROOMS: { img: string; title: string; meta: string; pieces: GlyphName[]; total: string }[] = [
  { img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=700&q=80&auto=format&fit=crop", title: "Warm Minimal Living", meta: "14′ × 12′ · Denver", pieces: ["sofa", "table", "tv", "rug"], total: "$2,140" },
  { img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=700&q=80&auto=format&fit=crop", title: "Studio Loft", meta: "18′ × 14′ · Chicago", pieces: ["sofa", "desk", "shelf"], total: "$1,620" },
  { img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=700&q=80&auto=format&fit=crop", title: "Japandi Bedroom", meta: "12′ × 11′ · Austin", pieces: ["bed", "dresser", "lamp"], total: "$2,780" },
  { img: "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=700&q=80&auto=format&fit=crop", title: "Reading Nook", meta: "8′ × 9′ · Portland", pieces: ["chair", "lamp", "shelf"], total: "$980" },
  { img: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=700&q=80&auto=format&fit=crop", title: "First Apartment", meta: "11′ × 13′ · Queens", pieces: ["bed", "rug", "mirror"], total: "$1,340" },
  { img: "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=700&q=80&auto=format&fit=crop", title: "Work Corner", meta: "9′ × 10′ · Seattle", pieces: ["desk", "chair", "plant"], total: "$760" }
];

export function RoomsRow() {
  return (
    <section id="rooms" className="py-24 md:py-32">
      <div className="mx-auto max-w-[1320px] px-5">
        <div className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.22em] text-ash">Rooms in the field</div>
        <h2 className="display-lg mx-auto max-w-3xl text-center text-[clamp(30px,4.6vw,58px)]">
          The best rooms are built piece by piece.
        </h2>
      </div>

      <div className="no-scrollbar mt-12 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 md:px-[max(20px,calc((100vw-1320px)/2))]">
        {ROOMS.map((r, i) => (
          <motion.a
            key={r.title}
            href="/canvas?demo=1"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: (i % 4) * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
            className="card card-lift group w-[240px] shrink-0 snap-start p-2.5 md:w-[276px]"
          >
            <div className="relative overflow-hidden rounded-xl">
              <img src={r.img} alt="" className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]" />
              <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium backdrop-blur">
                {r.total}
              </span>
              <div className="absolute inset-x-2 bottom-2 flex gap-1">
                {r.pieces.map((p) => (
                  <span key={p} className="grid h-7 w-7 place-items-center rounded-lg bg-white/85 text-ink backdrop-blur">
                    <Glyph name={p} className="h-3.5 w-3.5" strokeWidth={1.6} />
                  </span>
                ))}
              </div>
            </div>
            <div className="px-1 pb-1 pt-3">
              <div className="text-[14px] font-semibold tracking-[-0.02em]">{r.title}</div>
              <div className="mt-0.5 text-[11px] text-ash">{r.meta}</div>
            </div>
          </motion.a>
        ))}
      </div>
    </section>
  );
}
