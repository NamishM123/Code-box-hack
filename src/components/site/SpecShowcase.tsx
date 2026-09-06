"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

/** Butter puts a single product on a technical grid here. We put the piece that
 *  decides most rooms: the sofa, drawn to the inch. */
export function SpecShowcase() {
  return (
    <section className="mx-auto max-w-[1320px] px-5 py-24 md:py-32">
      <div className="grid items-center gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="eyebrow">Measured, not guessed</div>
          <h2 className="display-lg mt-5 text-[clamp(30px,4.2vw,54px)]">
            Furnish an entire room in one afternoon.
          </h2>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ash">
            Sightline treats every listing as a physical object first and a product second. Width, depth,
            height, and door clearance are checked against your room before a piece is ever shown to you.
            A sofa that cannot make the turn into your hallway never appears in your cart.
          </p>
          <div className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-rule pt-6">
            <Fact k="78″" v="max width for this wall" />
            <Fact k="34″" v="walkway kept clear" />
            <Fact k="4" v="shops priced live" />
          </div>
          <Link href="/capture" className="btn btn-primary group mt-8 px-6 py-3.5">
            Start with your room
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          className="card plan-grid relative overflow-hidden p-6 md:p-10"
        >
          <div className="flex items-start justify-between">
            <div className="mono text-[11px] text-ash">fig. 04 · seating</div>
            <div className="mono text-[11px] text-ash">scale 1:24</div>
          </div>

          <svg viewBox="0 0 420 300" className="mt-6 w-full">
            {/* dimension lines */}
            <g stroke="#6E6C67" strokeWidth="1">
              <path d="M60 62 H360" strokeDasharray="4 4" />
              <path d="M60 56 V68 M360 56 V68" />
              <path d="M382 96 V236" strokeDasharray="4 4" />
              <path d="M376 96 H388 M376 236 H388" />
            </g>
            <text x="210" y="48" textAnchor="middle" fontSize="13" fill="#0C0C0D" fontFamily="JetBrains Mono, monospace">78 in</text>
            <text x="400" y="170" textAnchor="middle" fontSize="13" fill="#0C0C0D" fontFamily="JetBrains Mono, monospace" transform="rotate(90 400 170)">36 in</text>

            {/* sofa, drawn */}
            <g>
              <rect x="60" y="96" width="300" height="140" rx="18" fill="#FF7A3D" opacity="0.16" />
              <rect x="60" y="96" width="300" height="140" rx="18" fill="none" stroke="#0C0C0D" strokeWidth="2.5" />
              <rect x="76" y="86" width="268" height="42" rx="14" fill="#FFF" stroke="#0C0C0D" strokeWidth="2" />
              <rect x="60" y="120" width="34" height="116" rx="14" fill="#FFF" stroke="#0C0C0D" strokeWidth="2" />
              <rect x="326" y="120" width="34" height="116" rx="14" fill="#FFF" stroke="#0C0C0D" strokeWidth="2" />
              <path d="M210 128 V236" stroke="#0C0C0D" strokeWidth="1.5" opacity="0.4" />
              <path d="M94 246 V262 M326 246 V262" stroke="#0C0C0D" strokeWidth="3" strokeLinecap="round" />
            </g>

            {/* callouts */}
            <g fontFamily="JetBrains Mono, monospace" fontSize="11" fill="#6E6C67">
              <circle cx="118" cy="166" r="4" fill="#FF5A1F" />
              <path d="M122 166 H176" stroke="#FF5A1F" strokeWidth="1" />
              <text x="182" y="170" fill="#0C0C0D">seat height 18 in</text>
              <circle cx="344" cy="106" r="4" fill="#2F5CFF" />
              <path d="M344 106 V78 H300" stroke="#2F5CFF" strokeWidth="1" />
              <text x="296" y="74" textAnchor="end" fill="#0C0C0D">clears the doorway</text>
            </g>
          </svg>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-5">
            <div>
              <div className="text-[15px] font-semibold tracking-[-0.02em]">Belden Linen 3-Seater Sofa</div>
              <div className="mt-0.5 text-[12px] text-ash">78 × 36 × 33 in · linen · seats 3</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="chip">Marketplace $649</span>
              <span className="chip">Amazon $780</span>
              <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-paper">Fits</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="display-lg text-[26px]">{k}</div>
      <div className="mt-1 text-[11px] leading-snug text-ash">{v}</div>
    </div>
  );
}
