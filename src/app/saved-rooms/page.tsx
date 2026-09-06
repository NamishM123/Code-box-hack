import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export default function SavedRoomsPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <Nav />
      <section className="mx-auto max-w-5xl px-6 pb-20 pt-32 md:pb-28 md:pt-36">
        <p className="eyebrow text-brass">Your projects</p>
        <h1 className="mt-4 font-display text-5xl md:text-6xl">Saved rooms</h1>
        <div className="card mt-12 max-w-2xl p-8 md:p-10">
          <h2 className="font-display text-3xl">Start your first room</h2>
          <p className="mt-3 max-w-lg text-sm leading-7 text-ash">Capture a room to create an editable brief, explore layouts, and keep refining your plan.</p>
          <Link href="/capture" className="btn btn-primary mt-7 text-xs uppercase tracking-[0.2em]">Capture a room</Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
