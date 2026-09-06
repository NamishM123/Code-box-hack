import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { PRINCIPLES, type Principle } from "@/lib/principles";

type Tradition = Principle["tradition"] | "all";

export function LibraryPage({ title, intro, tradition = "all" }: { title: string; intro: string; tradition?: Tradition }) {
  const principles = tradition === "all" ? PRINCIPLES : PRINCIPLES.filter((principle) => principle.tradition === tradition);

  return (
    <main className="min-h-screen">
      <Nav />
      <section className="mx-auto max-w-5xl px-6 py-16 md:py-24">
        <p className="text-[10px] uppercase tracking-[0.2em] text-ash">The Sightline library</p>
        <h1 className="mt-4 font-display text-5xl md:text-6xl">{title}</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-ash">{intro}</p>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {principles.map((principle) => (
            <article key={principle.key} className="card p-6">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ash">{principle.tradition.replace("-", " ")}</p>
              <h2 className="mt-3 font-display text-2xl text-ink">{principle.title}</h2>
              <p className="mt-3 text-sm leading-6 text-ash">{principle.body}</p>
            </article>
          ))}
        </div>

        <Link href="/capture" className="btn btn-primary mt-12 text-xs uppercase tracking-[0.2em]">Apply these to a room</Link>
      </section>
      <Footer />
    </main>
  );
}
