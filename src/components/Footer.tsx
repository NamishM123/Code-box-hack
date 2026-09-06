import Link from "next/link";

type FooterItem = string | { label: string; href: string };

const COLUMNS: { title: string; items: FooterItem[] }[] = [
  {
    title: "Product",
    items: [
      { label: "Overview", href: "/product" },
      { label: "Pieces", href: "/pieces" },
      { label: "How it works", href: "/how-it-works" }
    ]
  },
  {
    title: "Workspace",
    items: [
      { label: "Capture a room", href: "/capture" },
      { label: "Room canvas", href: "/canvas?demo=1" },
      { label: "Demo rooms", href: "/rooms" },
      { label: "Saved rooms", href: "/saved" }
    ]
  },
  {
    title: "Shops",
    items: [{ label: "Browse shops", href: "/shops" }, "Amazon", "Target", "Facebook Marketplace", "Wayfair"]
  },
  {
    title: "Company",
    items: [{ label: "Pricing", href: "/pricing" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }]
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

      {/* the oversized wordmark, set to match the header */}
      <div className="select-none px-3 pt-10">
        <div className="wordmark text-center text-[clamp(64px,18vw,280px)] uppercase leading-[0.9] tracking-[0.03em] text-ink/10">
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
