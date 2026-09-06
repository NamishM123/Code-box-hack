import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

type Card = { label: string; title: string; body: string };

export function EditorialPage({ eyebrow, title, intro, cards, action = "Open the demo room", href = "/canvas?demo=1" }: { eyebrow: string; title: string; intro: string; cards: Card[]; action?: string; href?: string }) {
  return <main className="min-h-screen"><Nav /><section className="relative overflow-hidden border-b border-rule/40"><div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(200,159,90,0.13),transparent)]" /><div className="relative mx-auto max-w-7xl px-6 py-20 md:py-28"><p className="text-[10px] uppercase tracking-[0.24em] text-brass">{eyebrow}</p><h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.95] md:text-7xl">{title}</h1><p className="mt-7 max-w-2xl text-[15px] leading-7 text-ash">{intro}</p><Link href={href} className="btn btn-primary mt-9 text-xs uppercase tracking-[0.18em]">{action}</Link></div></section><section className="mx-auto max-w-7xl px-6 py-16 md:py-24"><div className="grid gap-4 md:grid-cols-3">{cards.map((card) => <article key={card.title} className="card p-6"><p className="text-[10px] uppercase tracking-[0.2em] text-brass">{card.label}</p><h2 className="mt-4 font-display text-2xl">{card.title}</h2><p className="mt-3 text-sm leading-6 text-ash">{card.body}</p></article>)}</div></section><Footer /></main>;
}
