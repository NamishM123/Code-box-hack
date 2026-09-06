import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto max-w-[1320px] px-5 py-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <p className="max-w-sm text-[14px] leading-relaxed text-ash">
            A camera-first room editor for people who would rather make one confident decision
            than scroll a thousand listings.
          </p>
          <div className="flex gap-2">
            <Link href="/capture" className="btn btn-primary px-5 py-2.5 text-[13px]">Map your room</Link>
            <Link href="/canvas?demo=1" className="btn btn-light px-5 py-2.5 text-[13px]">Demo room</Link>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6 text-[12px] text-ash">
          <span>© {new Date().getFullYear()} Sightline · Not affiliated with any retailer</span>
          <div className="flex gap-5">
            <Link href="/privacy" className="link-underline hover:text-ink">Privacy Policy</Link>
            <Link href="/terms" className="link-underline hover:text-ink">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
