"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Glyph, type GlyphName } from "./Glyphs";

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: [0.2, 0.8, 0.2, 1] as const }
};

export function FeatureRows() {
  return (
    <div id="workflow" className="mx-auto max-w-[1320px] space-y-24 px-5 py-28 md:space-y-36 md:py-36">
      <Row
        eyebrow="The library"
        title="Browse curated pieces for sofas, tables, televisions, lighting, storage, and beyond."
        body="Every piece in Sightline is a block: a real listing with real width, depth, and height attached. Filter by room, by budget, by the shop you already trust. If a listing does not publish its dimensions, it never reaches your floor plan."
        bullets={["Sofas, sectionals, and lounge chairs", "Televisions, media consoles, and mounts", "Tables, rugs, lighting, and storage"]}
        mock={<MockLibrary />}
      />
      <Row
        reverse
        eyebrow="The controls"
        title="Make any piece your own with intuitive dials, sliders, swatches, and even raw dimensions."
        body="Drag a sofa two inches left and the walkway clearance recalculates live. Push the budget slider and the room re-shops itself. Every number is editable, and every placement explains itself in a sentence you can argue with."
        bullets={["Live clearance and door-swing checks", "Budget slider re-prices the whole room", "Palette pulled from your own photos"]}
        mock={<MockDials />}
      />
      <Row
        eyebrow="Your rooms"
        title="Save the rooms you love so you never start from an empty floor again."
        body="Rooms, carts, and measurements stay together. Duplicate a layout for the next apartment, send a shopping list to a roommate, or reopen a plan months later and re-check prices across every shop in one pass."
        bullets={["Shareable shopping lists", "Price re-checks across shops", "Duplicate a room into a new space"]}
        mock={<MockSaved />}
      />
    </div>
  );
}

function Row({
  eyebrow, title, body, bullets, mock, reverse
}: {
  eyebrow: string; title: string; body: string; bullets: string[]; mock: React.ReactNode; reverse?: boolean;
}) {
  return (
    <section className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
      <motion.div {...reveal} className={reverse ? "md:order-2" : ""}>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="display-lg mt-5 text-[clamp(28px,3.6vw,46px)]">{title}</h2>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-ash">{body}</p>
        <ul className="mt-7 space-y-2.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-[14px]">
              <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink text-paper">
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.08 }} className={reverse ? "md:order-1" : ""}>
        {mock}
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ mocks -- */

function PanelShell({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="panel p-3">
      <div className="flex items-center justify-between px-1.5 pb-3 pt-1">
        <span className="mono text-[11px] text-white/45">{title}</span>
        {right && <span className="rounded-full border border-white/12 px-2.5 py-1 text-[10px] text-white/55">{right}</span>}
      </div>
      {children}
    </div>
  );
}

const LIB: { name: GlyphName; label: string; price: string; shop: string; color: string }[] = [
  { name: "sofa", label: "Linen 3-Seater", price: "$649", shop: "Marketplace", color: "#FF7A3D" },
  { name: "tv", label: '65" Television', price: "$448", shop: "Walmart", color: "#4B76FF" },
  { name: "table", label: "Oak Coffee Table", price: "$219", shop: "Target", color: "#FFD36B" },
  { name: "chair", label: "Arch Chair", price: "$349", shop: "Amazon", color: "#6FA97F" },
  { name: "lamp", label: "Arc Floor Lamp", price: "$149", shop: "Amazon", color: "#9B6BFF" },
  { name: "shelf", label: "Walnut Shelf", price: "$259", shop: "Wayfair", color: "#E8825B" }
];

function MockLibrary() {
  return (
    <PanelShell title="library / living room" right="182 blocks">
      <div className="grid gap-3 rounded-[20px] border border-white/[0.07] bg-black/25 p-3 md:grid-cols-[112px_1fr]">
        <div className="hidden space-y-1 md:block">
          {["All pieces", "Seating", "Tables", "Media", "Lighting", "Storage"].map((c, i) => (
            <div
              key={c}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] ${i === 0 ? "bg-white/90 font-medium text-ink" : "text-white/50"}`}
            >
              {c}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {LIB.map((b) => (
            <div key={b.label} className="rounded-[14px] border border-white/10 bg-white/[0.04] p-2.5">
              <div className="grid h-12 w-full place-items-center rounded-lg" style={{ background: `${b.color}22`, color: b.color }}>
                <Glyph name={b.name} className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <div className="mt-2 truncate text-[10px] font-medium text-white/85">{b.label}</div>
              <div className="flex items-center justify-between text-[9px] text-white/45">
                <span className="truncate">{b.shop}</span>
                <span className="text-white/75">{b.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PanelShell>
  );
}

const DIALS = [
  { label: "Width", value: "78 in", pct: 62 },
  { label: "Depth", value: "36 in", pct: 41 },
  { label: "Budget", value: "$2,140", pct: 74 },
  { label: "Walkway", value: "34 in", pct: 55 }
];

function MockDials() {
  return (
    <PanelShell title="sofa · belden linen 3-seater" right="Fits">
      <div className="grid gap-3 rounded-[20px] border border-white/[0.07] bg-black/25 p-3 md:grid-cols-[1fr_150px]">
        <div className="space-y-3">
          {DIALS.map((d, i) => (
            <div key={d.label}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/50">{d.label}</span>
                <span className="mono text-white/85">{d.value}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.08]">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${d.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
                  className="h-full rounded-full bg-butter"
                />
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
            <div className="mono text-[10px] leading-relaxed text-white/55">
              <span className="text-butter">fit</span> = wall(14′0″) − sofa(6′6″) − console(1′4″)
              <br />
              <span className="text-emerald-300">clearance ok</span> · 34in walkway retained
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="grid h-24 place-items-center rounded-[14px] border border-white/10 bg-[#FF7A3D22] text-[#FF9B6B]">
            <Glyph name="sofa" className="h-10 w-10" strokeWidth={1.4} />
          </div>
          <div className="flex gap-1.5">
            {["#E9E0D2", "#C89F5A", "#3A342C", "#8C6A4B"].map((c) => (
              <span key={c} className="h-5 flex-1 rounded-md border border-white/15" style={{ background: c }} />
            ))}
          </div>
          <div className="rounded-lg bg-white/90 py-1.5 text-center text-[11px] font-medium text-ink">Place in room</div>
        </div>
      </div>
    </PanelShell>
  );
}

const SAVED = [
  { img: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&q=80&auto=format&fit=crop", name: "Warm Minimal Living", meta: "14′ × 12′ · 7 pieces", total: "$2,140" },
  { img: "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=400&q=80&auto=format&fit=crop", name: "Japandi Bedroom", meta: "12′ × 11′ · 6 pieces", total: "$2,780" },
  { img: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&q=80&auto=format&fit=crop", name: "Studio Loft", meta: "18′ × 14′ · 9 pieces", total: "$1,620" }
];

function MockSaved() {
  return (
    <PanelShell title="rooms / saved" right="Shared · 2">
      <div className="space-y-2 rounded-[20px] border border-white/[0.07] bg-black/25 p-3">
        {SAVED.map((r, i) => (
          <motion.div
            key={r.name}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.5 }}
            className="flex items-center gap-3 rounded-[14px] border border-white/10 bg-white/[0.04] p-2.5"
          >
            <img src={r.img} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-white/90">{r.name}</div>
              <div className="text-[10px] text-white/45">{r.meta}</div>
            </div>
            <div className="text-right">
              <div className="mono text-[12px] text-white/85">{r.total}</div>
              <div className="text-[9px] text-emerald-300/80">prices current</div>
            </div>
          </motion.div>
        ))}
        <div className="rounded-[14px] border border-dashed border-white/15 py-3 text-center text-[11px] text-white/40">
          + Start a new room
        </div>
      </div>
    </PanelShell>
  );
}
