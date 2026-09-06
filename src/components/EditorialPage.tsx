import Image from "next/image";
import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { Reveal } from "@/components/Reveal";

type Card = {
  label: string;
  title: string;
  body: string;
  /** Optional supporting photograph. Falls back to the set below. */
  image?: string;
  alt?: string;
};

/**
 * The shell the marketing pages are built from.
 *
 * It used to be an eyebrow, a headline, and three identical cards in a row
 * carrying "01 / 02 / 03" over their titles. That arrangement says nothing
 * about this product, gives the eye no reason to move, and is the single most
 * recognisable shape in generated web design.
 *
 * What it is now:
 *   1. an asymmetric split, copy against a real photograph, nothing centred
 *   2. a lead step at full size, with the remaining two stacked beside it
 *
 * Two different layout families, one small tracked label on the whole page,
 * and a real image in every panel.
 */

/* Empty rooms and the furnished result: the product's own before and after,
   used when a page does not name its own photography. */
const FALLBACK_IMAGES = [
  { src: "/demo-capture/empty-room-02.png", alt: "An empty bedroom photographed against the window wall" },
  { src: "/hero/hero-poster.jpg", alt: "A furnished dining room with an oval oak table and green chairs" },
  { src: "/demo-products/camel-chair.png", alt: "A camel leather lounge chair on a plain ground" }
];

/** "01" is not a label, it is a number the reader can already see. */
const isBareNumber = (s: string) => /^\d+$/.test(s.trim());

export function EditorialPage({
  eyebrow,
  title,
  intro,
  cards,
  action = "Map your room",
  href = "/capture",
  hero = { src: "/hero/hero-poster.jpg", alt: "A furnished dining room, warm oak against concrete" }
}: {
  eyebrow: string;
  title: string;
  intro: string;
  cards: Card[];
  action?: string;
  href?: string;
  hero?: { src: string; alt: string };
}) {
  const [lead, ...rest] = cards;

  return (
    <main className="flex min-h-screen flex-col">
      <Nav />

      {/* ─────────────────── split: copy left, photograph right ─────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-0 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(198,110,40,0.16),transparent_66%)] blur-2xl" />

        <div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-6 pb-20 pt-32 md:pb-28 md:pt-40 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6 xl:col-span-5">
            <Reveal>
              <p className="eyebrow text-brass">{eyebrow}</p>
              <h1 className="display-lg mt-6 text-[clamp(38px,5.4vw,68px)]">{title}</h1>
              <p className="prose-body mt-7 text-[16px]">{intro}</p>
              <Link href={href} className="btn btn-primary mt-9">
                {action}
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.12} className="lg:col-span-6 lg:col-start-7 xl:col-span-7">
            <figure className="relative">
              {/* A second frame behind the photograph, offset. Gives the image
                  a place to sit rather than floating on the page. */}
              <div className="absolute -bottom-4 -right-4 hidden h-full w-full rounded-[18px] border border-rule bg-card md:block" />
              <div className="relative overflow-hidden rounded-[18px] border border-rule-strong shadow-xl">
                <Image
                  src={hero.src}
                  alt={hero.alt}
                  width={1920}
                  height={1080}
                  priority
                  sizes="(max-width: 1024px) 100vw, 58vw"
                  className="h-full w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(8,6,5,0.26),transparent_42%)]" />
              </div>
            </figure>
          </Reveal>
        </div>
      </section>

      {/* ─────────────────── lead step, then the pair beside it ─────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 pb-24 md:pb-32">
        <div className="grid gap-5 lg:grid-cols-12">
          {lead && (
            <Reveal as="article" className="card card-lift group flex flex-col lg:col-span-7">
              {/* flex-1 rather than a fixed ratio: the lead card is as tall as
                  the pair beside it, and the photograph takes up whatever that
                  leaves instead of stranding an empty panel under the copy. */}
              <div className="relative min-h-[17rem] flex-1 overflow-hidden">
                <Image
                  src={lead.image ?? FALLBACK_IMAGES[0].src}
                  alt={lead.alt ?? FALLBACK_IMAGES[0].alt}
                  width={832}
                  height={620}
                  sizes="(max-width: 1024px) 100vw, 56vw"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-editorial group-hover:scale-[1.03]"
                />
                {/* Just enough to marry the photograph into the card below it.
                    The copy sits under the image, not on it, so this does not
                    need to carry any contrast. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,rgb(var(--card)),transparent)]" />
              </div>
              <div className="p-7 md:p-9">
                {!isBareNumber(lead.label) && (
                  <p className="eyebrow text-brass">{lead.label}</p>
                )}
                <h2 className="font-display mt-3 text-3xl md:text-4xl">{lead.title}</h2>
                <p className="prose-body mt-4">{lead.body}</p>
              </div>
            </Reveal>
          )}

          <div className="grid gap-5 lg:col-span-5">
            {rest.map((card, i) => (
              <Reveal
                key={card.title}
                as="article"
                delay={0.08 * (i + 1)}
                className="card card-lift group flex flex-col overflow-hidden sm:flex-row lg:flex-col"
              >
                <div className="relative aspect-[16/10] shrink-0 overflow-hidden sm:aspect-square sm:w-44 lg:aspect-[16/7] lg:w-full">
                  <Image
                    src={card.image ?? FALLBACK_IMAGES[(i + 1) % FALLBACK_IMAGES.length].src}
                    alt={card.alt ?? FALLBACK_IMAGES[(i + 1) % FALLBACK_IMAGES.length].alt}
                    width={640}
                    height={400}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 22rem, 34vw"
                    className="h-full w-full object-cover transition-transform duration-[900ms] ease-editorial group-hover:scale-[1.03]"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(to_top,rgb(var(--card)),transparent)] sm:hidden lg:block lg:h-20" />
                </div>
                <div className="flex flex-col justify-center p-6 md:p-7">
                  {!isBareNumber(card.label) && (
                    <p className="eyebrow text-brass">{card.label}</p>
                  )}
                  <h2 className="font-display mt-2 text-2xl">{card.title}</h2>
                  <p className="caption mt-2.5">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
