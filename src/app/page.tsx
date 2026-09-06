import { Nav } from "@/components/Nav";
import { Hero } from "@/components/site/Hero";
import { ShopMarquee } from "@/components/site/ShopMarquee";
import { Statement } from "@/components/site/Statement";
import { BlockStrip } from "@/components/site/BlockStrip";
import { FeatureRows } from "@/components/site/FeatureRows";
import { AllInOne } from "@/components/site/AllInOne";
import { SwapShowcase } from "@/components/site/SwapShowcase";
import { RoomsRow } from "@/components/site/RoomsRow";
import { SpecShowcase } from "@/components/site/SpecShowcase";
import { DuoCards } from "@/components/site/DuoCards";
import { Testimonials } from "@/components/site/Testimonials";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <ShopMarquee />
      <Statement />
      <BlockStrip />
      <FeatureRows />
      <AllInOne />
      <SwapShowcase />
      <RoomsRow />
      <SpecShowcase />
      <DuoCards />
      <Testimonials />
      <Footer />
    </main>
  );
}
