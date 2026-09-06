import { Nav } from "@/components/Nav";
import { Hero } from "@/components/site/Hero";
import { ShopMarquee } from "@/components/site/ShopMarquee";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <ShopMarquee />
      <Footer />
    </main>
  );
}
