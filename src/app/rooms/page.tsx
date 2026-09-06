"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, Trash2 } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { deleteRoom, listRooms, type SavedRoom } from "@/lib/storage";
import { money } from "@/lib/utils";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<SavedRoom[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => { setRooms(listRooms()); setReady(true); }, []);

  function remove(id: string) {
    deleteRoom(id);
    setRooms(listRooms());
  }

  return (
    <main className="min-h-screen">
      <Nav />
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="pill">Archive</div>
            <h1 className="font-display mt-3 text-5xl">Saved rooms</h1>
            <p className="mt-2 text-[13px] text-ash">Stored in this browser. Share links carry the full plan in the URL.</p>
          </div>
          <Link href="/capture" className="btn btn-primary"><Camera className="h-4 w-4" /> Map a new room</Link>
        </div>

        {ready && !rooms.length && (
          <div className="card grid place-items-center px-6 py-24 text-center">
            <div className="font-display text-3xl">Nothing saved yet.</div>
            <p className="mt-2 max-w-sm text-[13px] text-ash">Photograph a room, pick a layout, and hit Save. It lands here.</p>
            <Link href="/capture" className="btn btn-brass mt-6">Start a room</Link>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
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
        </div>
      </div>
      <Footer />
    </main>
  );
}
