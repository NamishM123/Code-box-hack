import Link from "next/link";

type FooterItem = string | { label: string; href: string };

const COLUMNS: { title: string; items: FooterItem[] }[] = [
  {
    title: "Product",
    items: [
      { label: "Capture a room", href: "/capture" },
      { label: "Room canvas", href: "/canvas?demo=1" },
      "Saved rooms",
      "Pricing"
    ]
  },
  {
    title: "Shops",
    items: ["Amazon", "Target", "Walmart", "Facebook Marketplace", "Wayfair"]
  },
  {
    title: "Library",
    items: ["Placement principles", "Clearances", "Feng shui", "Ergonomics"]
  },
  {
    title: "Company",
    items: ["About", "Journal", "Contact"]
  }
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-rule pt-16">
      <div className="mx-auto max-w-[1320px] px-5">
        <div className="grid gap-10 md:grid-cols-[1.3fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <p className="text-[14px] leading-relaxed text-ash">
              A camera-first room editor for people who would rather make one confident decision
              than scroll a thousand listings.
            </p>
            <div className="mt-6 flex gap-2">
              <Link href="/capture" className="btn btn-primary px-5 py-2.5 text-[13px]">Map your room</Link>
              <Link href="/canvas?demo=1" className="btn btn-light px-5 py-2.5 text-[13px]">Demo room</Link>
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.items.map((item) => {
                  const label = typeof item === "string" ? item : item.label;
                  const href = typeof item === "string" ? "#" : item.href;
                  return (
                    <li key={label}>
                      {href.startsWith("/") ? (
                        <Link href={href} className="text-[13px] text-ash transition-colors hover:text-ink">{label}</Link>
                      ) : (
                        <a href={href} className="text-[13px] text-ash transition-colors hover:text-ink">{label}</a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6 text-[12px] text-ash">
          <span>Prices and availability are checked at listing time. Verify before you buy.</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="link-underline hover:text-ink">Privacy Policy</Link>
            <Link href="/terms" className="link-underline hover:text-ink">Terms</Link>
          </div>
        </div>
      </div>

      {/* the oversized holographic wordmark, Butter-style */}
      <div className="select-none px-3 pt-10">
        <div className="chrome display-xl text-center text-[clamp(72px,20.5vw,320px)] italic leading-[0.78]">
          Sightline
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-2 px-5 py-5 text-[12px] text-ash">
          <span>© {new Date().getFullYear()} Sightline</span>
          <span>Not affiliated with any retailer</span>
        </div>
      </div>
    </footer>
  );
}
