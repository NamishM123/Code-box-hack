"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Ruler, Wallet, Palette } from "lucide-react";
import type { Category, RoomSpec } from "@/lib/types";

const STYLES = [
  { key: "modern-warm", label: "Modern Warm", swatch: ["#c98b6b", "#f0ead9", "#0b0b0f"] },
  { key: "japandi", label: "Japandi", swatch: ["#c9a874", "#f6f1ea", "#6b4a34"] },
  { key: "boho", label: "Boho", swatch: ["#c98b6b", "#5a6b4a", "#e6ddc9"] },
  { key: "scandi", label: "Scandi", swatch: ["#e6ddc9", "#a3b1a1", "#0b0b0f"] }
];
const CATS: { key: Category; label: string }[] = [
  { key: "sofa", label: "Sofa" },
  { key: "chair", label: "Accent chair" },
  { key: "table", label: "Coffee table" },
  { key: "rug", label: "Rug" },
  { key: "lamp", label: "Lamp" },
  { key: "shelf", label: "Shelf" },
  { key: "plant", label: "Plant" },
  { key: "art", label: "Wall art" }
];

export function Wizard({ onGenerate }: { onGenerate: (spec: RoomSpec) => void }) {
  const [step, setStep] = useState(0);
  const [spec, setSpec] = useState<RoomSpec>({
    widthFt: 14,
    depthFt: 12,
    budget: 2500,
    style: "modern-warm",
    mustHave: ["sofa", "table", "rug", "lamp"]
  });

  const set = (patch: Partial<RoomSpec>) => setSpec((s) => ({ ...s, ...patch }));
  const toggleCat = (c: Category) =>
    set({ mustHave: spec.mustHave.includes(c) ? spec.mustHave.filter((x) => x !== c) : [...spec.mustHave, c] });

  return (
    <div className="card p-6 md:p-8">
      <div className="mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-black/50">
        <span className={step === 0 ? "text-black" : ""}>Room</span>
        <span>·</span>
        <span className={step === 1 ? "text-black" : ""}>Budget</span>
        <span>·</span>
        <span className={step === 2 ? "text-black" : ""}>Style</span>
      </div>

      {step === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2"><Ruler className="h-4 w-4 text-clay" /><h3 className="font-display text-3xl">Your room</h3></div>
          <p className="mt-2 text-sm text-black/60">Approximate is fine. You can rearrange later.</p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Field label={`Width — ${spec.widthFt} ft`}>
              <input type="range" min={7} max={30} value={spec.widthFt} onChange={(e) => set({ widthFt: +e.target.value })} className="w-full accent-ink" />
            </Field>
            <Field label={`Depth — ${spec.depthFt} ft`}>
              <input type="range" min={7} max={30} value={spec.depthFt} onChange={(e) => set({ depthFt: +e.target.value })} className="w-full accent-ink" />
            </Field>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2">
            {CATS.map((c) => (
              <button
                key={c.key}
                onClick={() => toggleCat(c.key)}
                className={`rounded-xl border px-3 py-2 text-sm transition ${
                  spec.mustHave.includes(c.key) ? "border-ink bg-ink text-cream" : "border-black/10 bg-white/60 hover:bg-white"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <button className="btn btn-primary" onClick={() => setStep(1)}>Next <ArrowRight className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-clay" /><h3 className="font-display text-3xl">Your budget</h3></div>
          <p className="mt-2 text-sm text-black/60">Total spend across all retailers.</p>
          <div className="mt-8 text-center">
            <div className="font-display text-6xl">${spec.budget.toLocaleString()}</div>
            <input type="range" min={500} max={10000} step={100} value={spec.budget} onChange={(e) => set({ budget: +e.target.value })} className="mt-6 w-full accent-ink" />
            <div className="mt-2 flex justify-between text-xs text-black/50"><span>$500</span><span>$10,000</span></div>
          </div>
          <div className="mt-8 flex justify-between">
            <button className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep(2)}>Next <ArrowRight className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-clay" /><h3 className="font-display text-3xl">Your style</h3></div>
          <p className="mt-2 text-sm text-black/60">Pick the vibe. We&apos;ll tune the picks.</p>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {STYLES.map((s) => (
              <button
                key={s.key}
                onClick={() => set({ style: s.key })}
                className={`rounded-2xl border p-4 text-left transition ${
                  spec.style === s.key ? "border-ink bg-white shadow-sm" : "border-black/10 bg-white/60 hover:bg-white"
                }`}
              >
                <div className="flex gap-1">
                  {s.swatch.map((c) => <span key={c} className="h-6 w-6 rounded-full border border-black/10" style={{ background: c }} />)}
                </div>
                <div className="mt-3 font-display text-xl">{s.label}</div>
              </button>
            ))}
          </div>
          <div className="mt-8 flex justify-between">
            <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
            <button className="btn btn-primary" onClick={() => onGenerate(spec)}>Generate room <ArrowRight className="h-4 w-4" /></button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-xs uppercase tracking-widest text-black/50">{label}</div>
      {children}
    </label>
  );
}
