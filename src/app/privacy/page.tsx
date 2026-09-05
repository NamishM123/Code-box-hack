import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen">
      <Nav />
      <article className="mx-auto max-w-3xl px-6 pb-20 pt-32 md:pb-28 md:pt-36">
        <p className="text-[10px] uppercase tracking-[0.2em] text-brass">Sightline</p>
        <h1 className="mt-4 font-display text-5xl md:text-6xl">Privacy</h1>
        <p className="mt-5 text-sm text-ash">Last updated: September 5, 2026</p>

        <div className="mt-12 space-y-10 text-sm leading-7 text-ash">
          <Section title="What we process">
            Sightline processes the information you provide to create room recommendations, including room details, budget, style choices, and photos you choose to add during a session.
          </Section>
          <Section title="Photos and inspiration">
            Room photos are analyzed in your browser to help create an editable room brief. Inspiration images you upload are also analyzed in your browser. When you submit a Pinterest URL, Sightline retrieves the public preview image for that URL to extract its visual mood and palette.
          </Section>
          <Section title="How we use information">
            We use the information you provide to generate layouts, furniture suggestions, and design guidance. Sightline does not sell your personal information.
          </Section>
          <Section title="Your choices">
            You control the information you enter and the images you upload. Avoid adding photos that contain sensitive personal information. You may stop using Sightline at any time.
          </Section>
          <Section title="Contact">
            Questions about this policy can be sent to the Sightline team through the contact option in the footer.
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
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="mt-3">{children}</p>
    </section>
  );
}
