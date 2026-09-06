import { Hero } from "@/components/site/Hero";
import { Footer } from "@/components/Footer";

/**
 * One screen: the footage, the page links, the wordmark, the single action and
 * the marketplace carousel. The footer is the only thing under it, so privacy
 * and terms stay reachable — everything else lives on its own page.
 *
 * No <Nav> here: the hero carries its own, in white over the film.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <Footer />
    </main>
  );
}
