"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Heart, Sparkles, X } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { deleteRoom, listRooms, type SavedRoom } from "@/lib/storage";
import { seedDemoRooms } from "@/lib/demoRooms";
import { listLikedPins, removeLikedPin, saveStolenLook, type LikedPin } from "@/lib/storage";
import { stealLook } from "@/lib/vibe";
import { money } from "@/lib/utils";
import { SafeImage } from "@/components/SafeImage";

export default function RoomsPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<SavedRoom[]>([]);
  const [liked, setLiked] = useState<LikedPin[]>([]);
  const [ready, setReady] = useState(false);
  const [usingLookId, setUsingLookId] = useState<string | null>(null);

  useEffect(() => {
    seedDemoRooms();
    setRooms(listRooms());
    setLiked(listLikedPins());
    setReady(true);
  }, []);

  function remove(id: string) {
    deleteRoom(id);
    setRooms(listRooms());
  }

  function unlikePin(id: string) {
    removeLikedPin(id);
    setLiked(listLikedPins());
  }

  /** Same handoff as "Steal this Look" on the Pinterest tab: run the pin's
   * image through the vibe pipeline, then land on Brief with it pre-filled
   * so the live scraper's first search is shaped by this look. */
  async function useThisLook(pin: LikedPin) {
    if (usingLookId) return;
    setUsingLookId(pin.id);
    try {
      const look = await stealLook(pin.src);
      saveStolenLook(look);
      router.push("/capture");
    } finally {
      setUsingLookId(null);
    }
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <div>
            <div className="pill">Your Rooms</div>
            <h1 className="font-display mt-3 text-5xl">Your rooms</h1>
            <p className="mt-2 text-[13px] text-ash">Stored in this browser. Share links carry the full plan in the URL.</p>
          </div>
        </div>

        {ready && <div className="grid gap-4 md:grid-cols-3">
          <Link
            href="/capture"
            className="card card-lift group grid min-h-56 place-items-center border-dashed p-6 text-center hover:border-brass"
          >
            <span>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-rule bg-white transition group-hover:border-brass group-hover:text-brass">
                <Plus className="h-6 w-6" />
              </span>
              <span className="mt-4 block font-display text-2xl">Create a new room</span>
              <span className="mt-1 block text-[12px] text-ash">Photograph your space and start a new plan.</span>
            </span>
          </Link>

          {rooms.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="card card-lift p-5"
            >
              <div className="flex items-start justify-between">
                <div className="text-[10px] uppercase tracking-[0.2em] text-brass">{r.layoutName}</div>
                <button onClick={() => remove(r.id)} className="text-ash transition hover:text-red-400" title="Delete">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-2 font-display text-2xl leading-tight">{r.name}</div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.15em] text-ash">
                {r.spec.widthFt}′ × {r.spec.depthFt}′ · {r.placed.length} pieces
              </div>

              {r.spec.vibePalette && (
                <div className="mt-4 flex gap-1.5">
                  {r.spec.vibePalette.map((c) => (
                    <span key={c} className="h-6 w-6 rounded-full border border-rule/40" style={{ background: c }} />
                  ))}
                </div>
              )}

              <div className="divider my-4" />
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-ash">Total</div>
                  <div className="font-display text-xl">{money(r.total)}</div>
                </div>
                <Link href={`/canvas?room=${r.id}`} className="btn btn-ghost text-xs">Open</Link>
              </div>
              <div className="mt-3 text-[10px] text-ash/70">
                {new Date(r.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </motion.div>
          ))}
        </div>}

        {/* liked ideas inspiration */}
        {ready && (
          <section className="mt-16">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-400" fill="#f87171" stroke="#f87171" />
                  <span className="text-[10px] uppercase tracking-[0.2em] text-brass">Liked Inspiration</span>
                </div>
                <h2 className="font-display mt-2 text-3xl">Saved ideas</h2>
                <p className="mt-1 text-[13px] text-ash">
                  Images you&apos;ve liked from the{" "}
                  <Link href="/pinterest" className="link-underline font-medium text-ink">Ideas</Link>{" "}
                  feed.
                </p>
              </div>
              {liked.length > 0 && (
                <Link href="/pinterest" className="btn btn-ghost text-xs">
                  Browse more
                </Link>
              )}
            </div>

            {liked.length === 0 ? (
              <div className="card grid min-h-40 place-items-center border-dashed p-6 text-center">
                <div>
                  <Heart className="mx-auto h-8 w-8 text-rule" />
                  <p className="mt-3 font-display text-lg">No liked images yet</p>
                  <p className="mt-1 text-[12px] text-ash">
                    Head to the{" "}
                    <Link href="/pinterest" className="link-underline font-medium text-ink">Ideas</Link>{" "}
                    tab and hit the heart on images you love.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                <AnimatePresence>
                  {liked.map((pin, i) => (
                    <motion.div
                      key={pin.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className="card card-lift group relative overflow-hidden"
                    >
                      <div className="overflow-hidden">
                        <SafeImage
                          src={pin.src}
                          alt={pin.title}
                          label={pin.title}
                          className="block w-full"
                          style={{ aspectRatio: `1 / ${pin.aspect}` }}
                        />
                      </div>

                      {/* remove button */}
                      <button
                        onClick={() => unlikePin(pin.id)}
                        className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                        title="Remove from liked"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>

                      <div className="p-3">
                        <p className="truncate text-[13px] font-semibold text-ink">{pin.title}</p>
                        <p className="mt-0.5 text-[11px] text-ash">{pin.subtitle}</p>
                        <p className="mt-1.5 text-[10px] text-ash/60">
                          {new Date(pin.likedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                        <button
                          onClick={() => useThisLook(pin)}
                          disabled={usingLookId === pin.id}
                          className="btn btn-brass mt-3 w-full text-xs disabled:opacity-70"
                        >
                          <Sparkles className="h-3 w-3" />
                          {usingLookId === pin.id ? "Reading the look…" : "Use this look"}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
