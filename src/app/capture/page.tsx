"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, ImagePlus, Loader2, Ruler, Sun, X, ArrowRight, Sparkles, Link as LinkIcon, Upload } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { detectFromFiles, scoreQuality } from "@/lib/detectRoom";
import { extractVibeFromImage } from "@/lib/vibe";
import { STYLE_PRESETS } from "@/lib/principles";
import type { DetectedRoom, RoomType, Goal, Category } from "@/lib/types";

type Step = "frame" | "capture" | "confirm" | "brief";

interface Shot { id: string; file?: File; url: string; ok: boolean; reason?: string; demo?: boolean }

const EMPTY_ROOM_DEMO: Shot[] = Array.from({ length: 6 }, (_, index) => ({
  id: `empty-room-demo-${index + 1}`,
  url: `/demo-capture/empty-room-${String(index + 1).padStart(2, "0")}.png`,
  ok: true,
  demo: true
}));

export default function CapturePage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("frame");
  const [roomType, setRoomType] = useState<RoomType>("living");
  const [goal, setGoal] = useState<Goal>("refresh");
  const [shots, setShots] = useState<Shot[]>([]);
  const [demoCaptureEnabled, setDemoCaptureEnabled] = useState(true);
  const [detected, setDetected] = useState<DetectedRoom | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [budget, setBudget] = useState(2500);
  const [style, setStyle] = useState("warm-minimal");
  const [mustHave, setMustHave] = useState<Category[]>([]);
  const [pinUrl, setPinUrl] = useState("");
  const [pinImage, setPinImage] = useState<string | null>(null);
  const [vibe, setVibe] = useState<{ palette: string[]; tags: string[]; styleLabel?: string; searchTerms?: string[]; note?: string } | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [engine, setEngine] = useState<"gemini" | "local" | null>(null);

  useEffect(() => () => shots.forEach((s) => s.file && URL.revokeObjectURL(s.url)), [shots]);

  useEffect(() => {
    if (step === "capture" && demoCaptureEnabled && shots.length === 0) setShots(EMPTY_ROOM_DEMO);
  }, [step, demoCaptureEnabled, shots.length]);

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const items = Array.from(fileList).slice(0, 12 - shots.length);
    const scored: Shot[] = [];
    for (const file of items) {
      const q = await scoreQuality(file);
      scored.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file), ok: q.ok, reason: q.reason });
    }
    setShots((prev) => [...prev, ...scored]);
  }

  /** Demo shots are public URLs rather than uploads, so fetch them into Files. */
  async function shotFiles(): Promise<File[]> {
    const usable = shots.filter((s) => s.ok).length ? shots.filter((s) => s.ok) : shots;
    const out: File[] = [];
    for (const s of usable.slice(0, 8)) {
      if (s.file) { out.push(s.file); continue; }
      try {
        const blob = await fetch(s.url).then((r) => r.blob());
        out.push(new File([blob], `${s.id}.png`, { type: blob.type || "image/png" }));
      } catch {
        /* skip a shot we cannot read */
      }
    }
    return out;
  }

  async function analyze() {
    setAnalyzing(true);
    const files = await shotFiles();

    // Gemini reads the actual geometry. If it is unavailable, fall back to the
    // local heuristic so the flow never dead-ends.
    if (files.length) {
      try {
        const form = new FormData();
        form.append("roomType", roomType);
        files.forEach((f) => form.append("photos", f));
        const res = await fetch("/api/analyze-room", { method: "POST", body: form });
        if (res.ok) {
          const json = await res.json();
          if (json.detected) {
            setDetected(json.detected);
            setEngine("gemini");
            setAnalyzing(false);
            setStep("confirm");
            return;
          }
        }
      } catch {
        /* fall through to the local heuristic */
      }
    }

    const d = await detectFromFiles(files, roomType);
    setDetected(d);
    setEngine("local");
    setAnalyzing(false);
    setStep("confirm");
  }

  async function applyPinterest() {
    if (!pinUrl) return;
    setPinLoading(true);
    setPinError(null);
    try {
      const res = await fetch("/api/pinterest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: pinUrl })
      });
      const json = await res.json();
      if (!res.ok) { setPinError(json.message || "Could not read that link."); return; }
      if (json.images?.[0]) setPinImage(json.images[0]);
      if (json.vibe) {
        setVibe(json.vibe);
      } else if (json.images?.[0]) {
        const blob = await fetch(json.images[0]).then((r) => r.blob());
        setVibe(await extractVibeFromImage(blob));
      }
    } catch (e) {
      setPinError("Could not reach the pin. Try uploading a screenshot instead.");
    } finally { setPinLoading(false); }
  }

  async function applyInspirationFile(file: File) {
    setPinImage(URL.createObjectURL(file));
    setPinLoading(true);
    setPinError(null);
    try {
      const form = new FormData();
      form.append("images", file);
      const res = await fetch("/api/pinterest", { method: "POST", body: form });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.vibe) { setVibe(json.vibe); return; }
      setVibe(await extractVibeFromImage(file));
    } catch {
      setVibe(await extractVibeFromImage(file));
    } finally { setPinLoading(false); }
  }

  function toGo() {
    const brief = {
      roomType, goal, budget, style, mustHave,
      widthFt: detected?.widthFt ?? 14, depthFt: detected?.depthFt ?? 12,
      vibeTags: vibe?.tags, vibePalette: vibe?.palette,
      searchTerms: vibe?.searchTerms,
      // Keep the reference views with the spatial brief. Demo shots are public
      // assets, and user shots remain available for the immediate canvas view.
      capturePhotoUrls: shots.filter((s) => s.ok).map((s) => s.url),
      detected
    };
    sessionStorage.setItem("sightline:brief", JSON.stringify(brief));
    router.push("/canvas");
  }

  const okCount = shots.filter((s) => s.ok).length;
  const canAnalyze = okCount >= 3;
  const isDemoCapture = shots.length > 0 && shots.every((s) => s.demo);

  return (
    <main className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Stepper step={step} />
        <AnimatePresence mode="wait">
          {step === "frame" && (
            <Section key="frame" title="Frame the room" subtitle="Choose the room and the goal. This shapes the capture guide and the recommendation.">
              <div className="grid gap-6 md:grid-cols-2">
                <PanelGroup label="Room type" items={[
                  { k: "living", l: "Living" },
                  { k: "bedroom", l: "Bedroom" },
                  { k: "office", l: "Office" },
                  { k: "studio", l: "Studio" }
                ]} value={roomType} onChange={(v) => setRoomType(v as RoomType)} />
                <PanelGroup label="Goal" items={[
                  { k: "functional", l: "Make it functional" },
                  { k: "storage", l: "Add storage" },
                  { k: "seating", l: "Replace seating" },
                  { k: "refresh", l: "Refresh the look" }
                ]} value={goal} onChange={(v) => setGoal(v as Goal)} />
              </div>
              <NextBar onNext={() => setStep("capture")} />
            </Section>
          )}

          {step === "capture" && (
            <Section key="capture" title="Capture" subtitle="6-12 clear photos. Stand in each corner and take one wide shot. Then add close-ups of doors, windows, and tight areas.">
              <div className="grid gap-6 md:grid-cols-[1fr_260px]">
                <div>
                  <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                    {shots.map((s) => (
                      <div key={s.id} className={`group relative aspect-square overflow-hidden rounded-md border ${s.ok ? "border-rule/60" : "border-red-500/60"}`}>
                        <img src={s.url} alt="" className="h-full w-full object-cover" />
                        <button onClick={() => setShots((p) => p.filter((x) => x.id !== s.id))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-ink/70"><X className="h-3 w-3" /></button>
                        {!s.ok && <div className="absolute inset-x-0 bottom-0 bg-red-500/90 p-1 text-[10px]">{s.reason}</div>}
                        {s.ok && <div className="absolute right-1 bottom-1 grid h-5 w-5 place-items-center rounded-full bg-brass text-ink"><Check className="h-3 w-3" /></div>}
                      </div>
                    ))}
                    {shots.length < 12 && (
                      <label className="grid aspect-square cursor-pointer place-items-center rounded-md border border-dashed border-rule/60 text-ash hover:border-brass hover:text-brass">
                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
                        <ImagePlus className="h-6 w-6" />
                      </label>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ash">
                    <span>{shots.length}/12 photos · {okCount} usable</span>
                    {isDemoCapture && <><span className="text-brass">Empty-room demo set</span><button className="text-paper underline underline-offset-4" onClick={() => { setDemoCaptureEnabled(false); setShots([]); }}>Use my own photos</button></>}
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Capture guide</div>
                  <ul className="mt-3 space-y-3 text-[13px] text-ash">
                    <li className="flex gap-2"><Camera className="mt-0.5 h-3.5 w-3.5 text-brass" /> Stand in each corner. One wide photo per corner.</li>
                    <li className="flex gap-2"><Sun className="mt-0.5 h-3.5 w-3.5 text-brass" /> Turn on the lights. Avoid direct backlight from windows.</li>
                    <li className="flex gap-2"><Ruler className="mt-0.5 h-3.5 w-3.5 text-brass" /> Include the floor and ceiling in every frame.</li>
                    <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 text-brass" /> Capture doors, windows, and any tall furniture head-on.</li>
                  </ul>
                  <div className="divider my-4" />
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ash">Your capture stays private. Delete anytime.</div>
                </div>
              </div>
              <NextBar
                onBack={() => setStep("frame")}
                onNext={analyze}
                nextLabel={analyzing ? "Analyzing…" : isDemoCapture ? "Analyze demo room" : "Analyze the room"}
                disabled={!canAnalyze || analyzing}
                icon={analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
              />
              {!canAnalyze && <div className="mt-2 text-right text-[11px] text-ash">Add at least 3 usable photos to continue.</div>}
            </Section>
          )}

          {step === "confirm" && detected && (
            <Section key="confirm" title="Confirm the room" subtitle={`Confidence ${(detected.confidence * 100).toFixed(0)}%. ${engine === "gemini" ? "Read from your photos by Gemini vision." : "Estimated locally — no vision key set."} Edit anything that looks off.`}>
              <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
                <div className="card p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Room</div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <NumberField label="Width (ft)" value={detected.widthFt} onChange={(v) => setDetected({ ...detected, widthFt: v })} />
                    <NumberField label="Depth (ft)" value={detected.depthFt} onChange={(v) => setDetected({ ...detected, depthFt: v })} />
                  </div>
                  <div className="divider my-5" />
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Openings</div>
                  <ul className="mt-3 space-y-2 text-[13px]">
                    {detected.openings.map((o, i) => (
                      <li key={i} className="flex items-center justify-between rounded-md border border-rule/40 px-3 py-2">
                        <span>{o.kind === "door" ? "Door" : "Window"} · {o.widthFt} ft · wall {o.wall}</span>
                        <button className="text-[11px] text-ash hover:text-brass" onClick={() => setDetected({ ...detected, openings: detected.openings.filter((_, j) => j !== i) })}>remove</button>
                      </li>
                    ))}
                  </ul>
                  <div className="divider my-5" />
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Existing to keep</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {detected.existing.map((e, i) => (
                      <span key={i} className="chip">{e.label} · {e.widthFt}×{e.depthFt}</span>
                    ))}
                    {!detected.existing.length && <span className="text-[12px] text-ash">Nothing yet.</span>}
                  </div>
                </div>
                <div className="card p-5">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Light + palette</div>
                  <div className="mt-3 text-[13px] text-ash">{detected.lightingNote}</div>
                  <div className="mt-4 flex gap-2">
                    {detected.palette.map((c) => <span key={c} className="h-8 w-8 rounded-full border border-rule/50" style={{ background: c }} />)}
                  </div>
                  <div className="divider my-5" />
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ash">Sightline shows estimates. Your edits are the source of truth.</div>
                </div>
              </div>
              <NextBar onBack={() => setStep("capture")} onNext={() => setStep("brief")} />
            </Section>
          )}

          {step === "brief" && (
            <Section key="brief" title="Brief" subtitle="Budget, style, must-haves, and inspiration. We'll build three principled layouts from here.">
              <div className="grid gap-6 md:grid-cols-[1.15fr_1fr]">
                <div className="space-y-5">
                  <div className="card p-5">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Budget</div>
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="font-display text-5xl">${budget.toLocaleString()}</span>
                      <span className="text-xs text-ash">total across all sources</span>
                    </div>
                    <input type="range" min={500} max={10000} step={100} value={budget} onChange={(e) => setBudget(+e.target.value)} className="mt-4 w-full accent-brass" />
                  </div>

                  <div className="card p-5">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Style</div>
                    <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
                      {STYLE_PRESETS.map((s) => (
                        <button key={s.key} onClick={() => setStyle(s.key)} className={`rounded-md border p-3 text-left transition ${style === s.key ? "border-brass" : "border-rule/40 hover:border-ash/40"}`}>
                          <div className="flex gap-1">{s.palette.slice(0, 4).map((c) => <span key={c} className="h-4 w-4 rounded-full border border-rule/40" style={{ background: c }} />)}</div>
                          <div className="mt-2 font-display text-lg">{s.label}</div>
                          <div className="text-[11px] text-ash">{s.vibe.join(" · ")}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="card p-5">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Must-haves</div>
                    <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-4">
                      {(["sofa", "chair", "table", "rug", "lamp", "shelf", "plant", "art", "bed", "desk", "dresser", "mirror"] as Category[]).map((c) => {
                        const on = mustHave.includes(c);
                        return (
                          <button key={c} onClick={() => setMustHave((m) => on ? m.filter((x) => x !== c) : [...m, c])} className={`rounded-md border px-3 py-2 text-xs uppercase tracking-widest transition ${on ? "border-brass bg-brass text-ink" : "border-rule/40 text-ash hover:border-ash"}`}>{c}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="card p-5">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Inspiration</div>
                      <Sparkles className="h-4 w-4 text-brass" />
                    </div>
                    <p className="mt-2 text-[12px] text-ash">Paste a Pinterest link or upload a screenshot. We read the palette and vibe.</p>
                    <div className="mt-4 flex gap-2">
                      <div className="flex flex-1 items-center rounded-md border border-rule/40 px-3">
                        <LinkIcon className="h-3.5 w-3.5 text-ash" />
                        <input value={pinUrl} onChange={(e) => setPinUrl(e.target.value)} placeholder="https://pinterest.com/pin/…" className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-ash/60" />
                      </div>
                      <button onClick={applyPinterest} disabled={!pinUrl || pinLoading} className="btn btn-brass">{pinLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Read"}</button>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px] text-ash">
                      <span>or</span>
                      <label className="inline-flex cursor-pointer items-center gap-1 text-brass hover:underline">
                        <Upload className="h-3.5 w-3.5" /> upload screenshot
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && applyInspirationFile(e.target.files[0])} />
                      </label>
                    </div>
                    {pinImage && (
                      <div className="mt-4 overflow-hidden rounded-md border border-rule/40">
                        <img src={pinImage} alt="" className="max-h-64 w-full object-cover" />
                      </div>
                    )}
                    {pinError && <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/5 p-2 text-[11px] text-red-300">{pinError}</div>}
                    {vibe && (
                      <div className="mt-4">
                        {vibe.styleLabel && (
                          <div className="mb-3">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-ash">Reads as</div>
                            <div className="font-display text-2xl">{vibe.styleLabel}</div>
                            {vibe.note && <p className="mt-1 text-[12px] leading-relaxed text-ash">{vibe.note}</p>}
                          </div>
                        )}
                        <div className="text-[10px] uppercase tracking-[0.2em] text-ash">Palette</div>
                        <div className="mt-2 flex gap-1.5">{vibe.palette.map((c) => <span key={c} className="h-6 w-6 rounded-full border border-rule/40" style={{ background: c }} />)}</div>
                        <div className="mt-3 flex flex-wrap gap-1.5">{vibe.tags.map((t) => <span key={t} className="chip">{t}</span>)}</div>
                        {vibe.searchTerms?.length ? (
                          <div className="mt-4">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-brass">We&apos;ll shop these</div>
                            <ul className="mt-2 space-y-1">
                              {vibe.searchTerms.map((t) => (
                                <li key={t} className="border-l-2 border-brass/40 pl-2 text-[12px] text-ash">{t}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <NextBar onBack={() => setStep("confirm")} onNext={toGo} nextLabel="See the layouts" icon={<ArrowRight className="h-4 w-4" />} />
            </Section>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </main>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: Step[] = ["frame", "capture", "confirm", "brief"];
  const labels: Record<Step, string> = { frame: "Frame", capture: "Capture", confirm: "Confirm", brief: "Brief" };
  const idx = steps.indexOf(step);
  return (
    <div className="mb-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-3">
          <span className={i <= idx ? "text-paper" : "text-ash/60"}>{String(i + 1).padStart(2, "0")} · {labels[s]}</span>
          {i < steps.length - 1 && <span className="h-px w-8 bg-rule/60" />}
        </div>
      ))}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <h1 className="font-display text-4xl md:text-5xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-[14px] text-ash">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </motion.section>
  );
}

function PanelGroup<T extends string>({ label, items, value, onChange }: { label: string; items: { k: T; l: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="card p-5">
      <div className="text-[10px] uppercase tracking-[0.2em] text-brass">{label}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {items.map((it) => (
          <button key={it.k} onClick={() => onChange(it.k)} className={`rounded-md border px-3 py-3 text-left text-sm transition ${value === it.k ? "border-brass bg-brass/5" : "border-rule/40 hover:border-ash/40"}`}>
            {it.l}
          </button>
        ))}
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-[0.2em] text-ash">{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(+e.target.value)} className="mt-1 w-full rounded-md border border-rule/40 bg-transparent px-3 py-2 text-lg outline-none focus:border-brass" />
    </label>
  );
}

function NextBar({ onBack, onNext, nextLabel = "Next", disabled, icon }: { onBack?: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="mt-8 flex items-center justify-between">
      {onBack ? <button className="btn btn-ghost" onClick={onBack}>Back</button> : <span />}
      <button className="btn btn-primary" onClick={onNext} disabled={disabled}>{nextLabel} {icon}</button>
    </div>
  );
}
