import Link from "next/link";

import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { Reveal } from "@/components/Reveal";
import { PRINCIPLES, type Principle } from "@/lib/principles";

type Tradition = Principle["tradition"] | "all";

/* The stored keys are slugs. These are what a reader should see. */
const TRADITION_LABEL: Record<Principle["tradition"], string> = {
  "feng-shui": "Feng shui",
  ergonomic: "Ergonomics",
  compositional: "Composition",
  phenomenological: "Light and atmosphere"
};

/* Order the groups deliberately rather than by whatever the data happens to
   list first. */
const TRADITION_ORDER: Principle["tradition"][] = [
  "compositional",
  "feng-shui",
  "ergonomic",
  "phenomenological"
];

/**
 * The library pages.
 *
 * /principles renders all twenty-four entries. Previously that was a flat
 * two-column grid of identical cards, each one carrying its own small tracked
 * label, so the page was twenty-four repetitions of the same shape and
 * twenty-four labels. A list that long is a grouping problem, not a layout
 * problem.
 *
 * It now reads as an index: the tradition names the group once, in a column
 * that stays with you as you read past it, and the entries beside it are
 * divided by rules rather than boxed individually.
 */
export function LibraryPage({
  title,
  intro,
  tradition = "all"
}: {
  title: string;
  intro: string;
  tradition?: Tradition;
}) {
  const principles = tradition === "all" ? PRINCIPLES : PRINCIPLES.filter((p) => p.tradition === tradition);

  const groups = TRADITION_ORDER.map((key) => ({
    key,
    label: TRADITION_LABEL[key],
    items: principles.filter((p) => p.tradition === key)
  })).filter((g) => g.items.length > 0);

  return (
    <main className="flex min-h-screen flex-col">
      <Nav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-32 top-0 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(224,174,85,0.11),transparent_66%)] blur-2xl" />

        <div className="relative mx-auto max-w-[1200px] px-6 pb-16 pt-32 md:pb-20 md:pt-40">
          <Reveal>
            <p className="eyebrow text-brass">The Sightline library</p>
            <h1 className="display-lg mt-6 max-w-3xl text-[clamp(38px,5.2vw,64px)]">{title}</h1>
            <p className="prose-body mt-7 text-[16px]">{intro}</p>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-6 pb-24 md:pb-32">
        {groups.map((group) => (
          <div
            key={group.key}
            className="grid gap-x-12 gap-y-8 border-t border-rule py-12 md:py-16 lg:grid-cols-12"
          >
            {/* The group name, once, and it stays put while its entries scroll. */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28">
                <h2 className="font-display text-3xl md:text-4xl">{group.label}</h2>
                <p className="caption mt-2 text-[13px]">
                  {group.items.length} {group.items.length === 1 ? "principle" : "principles"}
                </p>
              </div>
            </div>

            <div className="lg:col-span-8">
              <ul className="divide-y divide-rule/70">
                {group.items.map((principle, i) => (
                  <Reveal
                    key={principle.key}
                    as="li"
                    delay={Math.min(i, 4) * 0.05}
                    className="group py-6 first:pt-0 last:pb-0"
                  >
                    <h3 className="font-display text-xl text-ink transition-colors duration-500 group-hover:text-butter md:text-2xl">
                      {principle.title}
                    </h3>
                    <p className="prose-body mt-2.5">{principle.body}</p>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        ))}

        <div className="border-t border-rule pt-12">
          <Reveal>
            <p className="prose-body text-[16px] text-ink">
              Every one of these is applied as an inspectable reason on a real placement.
            </p>
            <Link href="/capture" className="btn btn-primary mt-6">
              Apply these to a room
            </Link>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
