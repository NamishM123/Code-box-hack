import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export default function TermsPage() {
  return (
    <main className="min-h-screen">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Sightline</p>
        <h1 className="mt-4 font-display text-5xl md:text-6xl">Terms of use</h1>
        <p className="mt-5 text-sm text-ash">Last updated: September 5, 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-7 text-ash">
          <Section title="Using Sightline">
            Sightline provides room-planning ideas, layout guidance, and product suggestions for personal, non-commercial use. Use the service responsibly and only with content you have the right to use.
          </Section>
          <Section title="Design guidance">
            Sightline&apos;s layouts, dimensions, and recommendations are estimates for inspiration and planning. Verify measurements, installation requirements, accessibility, safety, and retailer details before making a purchase or changing a space.
          </Section>
          <Section title="Third-party products">
            Product references and retailer information may change. Sightline is not affiliated with retailers and does not guarantee product availability, pricing, quality, or fulfillment.
          </Section>
          <Section title="Service changes">
            We may update, suspend, or discontinue features as we improve Sightline. We may also revise these terms; continued use after an update means you accept the revised terms.
          </Section>
          <Section title="Contact">
            If you have questions about these terms, contact the Sightline team through the contact option in the footer.
          </Section>
        </div>
      </article>
      <Footer />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-paper">{title}</h2>
      <p className="mt-3">{children}</p>
    </section>
  );
}
