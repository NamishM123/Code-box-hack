import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

const CARDS = [
  { label: "01", title: "Capture", body: "Six clear photos give the room editor a starting point. You can use the demo room at any time." },
  { label: "02", title: "Arrange", body: "Move furniture blocks, choose a layout, and inspect the rationale behind every placement." },
  { label: "03", title: "Compare", body: "Open product links and compare listings side by side before deciding where to buy." }
];

export default function ProductPage() {
  return (
    <main className="min-h-screen">
      <Nav />

      <section className="relative overflow-hidden border-b border-rule/40">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(200,159,90,0.13),transparent)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28">
          <p className="text-[10px] uppercase tracking-[0.24em] text-brass">The product</p>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.95] md:text-7xl">
            A room editor for considered decisions.
          </h1>
          <p className="mt-7 max-w-2xl text-[15px] leading-7 text-ash">
            Sightline turns a short set of room photos into an editable plan you can test before you follow a
            product link.
          </p>
          <Link href="/canvas?demo=1" className="btn btn-primary mt-9 text-xs uppercase tracking-[0.18em]">
            Open the demo room
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-[220px_1fr_220px] md:gap-8">
          <img
            src="/product/sketch-living-room-01.jpg"
            alt="Hand-drawn sketch of a living room layout"
            className="hidden h-full max-h-[560px] w-full rounded-lg border-[6px] border-ink object-cover md:block"
          />

          <div className="space-y-10">
            {CARDS.map((card) => (
              <article key={card.title} className="border-t border-rule pt-6 first:border-t-0 first:pt-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-brass">{card.label}</p>
                <h2 className="mt-4 font-display text-2xl">{card.title}</h2>
                <p className="mt-3 text-sm leading-6 text-ash">{card.body}</p>
              </article>
            ))}
          </div>

          <img
            src="/product/sketch-living-room-02.jpg"
            alt="Hand-drawn sketch of a living room with fireplace"
            className="hidden h-full max-h-[560px] w-full rounded-lg border-[6px] border-ink object-cover md:block"
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
