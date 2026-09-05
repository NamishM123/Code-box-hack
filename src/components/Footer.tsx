export function Footer() {
  return (
    <footer className="border-t border-rule/40 py-14">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <div className="font-display text-3xl">Sightline</div>
          <div className="mt-2 max-w-sm text-[13px] text-ash">A camera-first room editor for people who would rather make one confident decision than scroll a thousand listings.</div>
        </div>
        <FooterCol title="Product" items={[
          { label: "Capture", href: "/capture" },
          { label: "Canvas", href: "/canvas" },
          { label: "Saved rooms", href: "/saved-rooms" }
        ]} />
        <FooterCol title="Library" items={[
          { label: "Principles", href: "/principles" },
          { label: "Feng shui", href: "/feng-shui" },
          { label: "Ergonomics", href: "/ergonomics" }
        ]} />
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-brass">Company</div>
          <ul className="mt-3 space-y-2 text-[13px] text-ash">
            <li><a href="/privacy" className="hover:text-paper">Privacy</a></li>
            <li><a href="/terms" className="hover:text-paper">Terms</a></li>
            <li><a href="#" className="hover:text-paper">Contact</a></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl items-center justify-between px-6 text-[11px] uppercase tracking-[0.2em] text-ash">
        <span>© {new Date().getFullYear()} Sightline</span>
        <span>Not affiliated with any retailer</span>
      </div>
    </footer>
  );
}

type FooterItem = { label: string; href: string };

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-brass">{title}</div>
      <ul className="mt-3 space-y-2 text-[13px] text-ash">
        {items.map((item) => <li key={item.href}><a href={item.href} className="hover:text-paper">{item.label}</a></li>)}
      </ul>
    </div>
  );
}
