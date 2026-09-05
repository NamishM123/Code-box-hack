export function Footer() {
  return (
    <footer className="border-t border-black/5 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 md:flex-row md:items-center">
        <div>
          <div className="font-display text-2xl">Roomly</div>
          <div className="text-xs text-black/50">© {new Date().getFullYear()} Roomly. Not affiliated with any retailer.</div>
        </div>
        <div className="flex gap-6 text-sm text-black/60">
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </div>
    </footer>
  );
}
