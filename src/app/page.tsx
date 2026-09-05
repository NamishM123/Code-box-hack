import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Steps } from "@/components/Steps";
import { PrinciplesSection } from "@/components/PrinciplesSection";
import { Gallery } from "@/components/Gallery";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Marquee />
      <Steps />
      <PrinciplesSection />
      <Gallery />
      <Footer />
    </main>
  );
}
