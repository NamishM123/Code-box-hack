import { Hero } from "@/components/site/Hero";

/**
 * One screen, nothing below it: the footage, the wordmark, the single action,
 * and the marketplace carousel. Everything else lives on its own page.
 */
export default function Home() {
  return (
    <main>
      <Hero />
    </main>
  );
}
