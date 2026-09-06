"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { toggleLikedPin, listLikedPins } from "@/lib/storage";

/* ------------------------------------------------------------------ data -- */

type Category = "office" | "bedroom" | "living-room";

interface Pin {
  id: string;
  src: string;
  srcLarge?: string;
  alt: string;
  aspect: number;
  title: string;
  subtitle: string;
  photographer?: string;
}

const TABS: { key: Category; label: string; Icon: (props: { color: string }) => JSX.Element }[] = [
  { key: "office", label: "Office", Icon: DeskIcon },
  { key: "bedroom", label: "Bedroom", Icon: BedIcon },
  { key: "living-room", label: "Living Room", Icon: SofaIcon },
];

const HUE: Record<Category, { bg: string; accent: string; muted: string }> = {
  office: { bg: "#141311", accent: "#8B7355", muted: "#C4B59D" },
  bedroom: { bg: "#141213", accent: "#9B7B8A", muted: "#C9B0BC" },
  "living-room": { bg: "#111411", accent: "#6B8F71", muted: "#A3C4A8" },
};

/* ---- minimalist furniture icons (stroke-only, currentColor-free so the ---- */
/* ---- active tab color can be passed straight in) -------------------------- */

function DeskIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M9 4h6v5H9V4ZM3 9h18M5 9v11M19 9v11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BedIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 19v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 19v2M21 19v2M3 15h18M6 10V6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SofaIcon({ color }: { color: string }) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12V8a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4M4 12h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1ZM4 17v2M20 17v2"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ---- Unsplash API fetch ---- */

async function fetchUnsplashPins(category: Category, page: number): Promise<Pin[] | null> {
  try {
    const res = await fetch(
      `/api/unsplash?category=${category}&page=${page}&per_page=20`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.photos || !Array.isArray(data.photos)) return null;
    return data.photos.map(
      (p: {
        id: string;
        src: string;
        srcLarge: string;
        alt: string;
        aspect: number;
        photographer: string;
      }) => ({
        id: p.id,
        src: p.src,
        srcLarge: p.srcLarge,
        alt: p.alt,
        aspect: p.aspect,
        title: p.alt || "Interior inspiration",
        subtitle: `Photo by ${p.photographer}`,
        photographer: p.photographer,
      })
    );
  } catch {
    return null;
  }
}

/* ---- SVG fallback generators ---- */

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const PALETTES: Record<Category, string[][]> = {
  office: [
    ["#D4C5A9", "#B8A88A", "#9C8B6E", "#7A6F5A"],
    ["#C9D6D9", "#A3B5BA", "#7D949C", "#5A757E"],
    ["#E8DCC8", "#D1C4A8", "#BAAC88", "#A39468"],
    ["#D6CFC4", "#BFB5A6", "#A89B88", "#91816A"],
    ["#C4CCD0", "#A8B4BA", "#8C9CA4", "#70848E"],
    ["#E0D4C0", "#CCBDA4", "#B8A688", "#A48F6C"],
  ],
  bedroom: [
    ["#E8D4D4", "#D4B8B8", "#C09C9C", "#AC8080"],
    ["#D4D0E8", "#B8B4D4", "#9C98C0", "#807CAC"],
    ["#E8D8E0", "#D4BCC8", "#C0A0B0", "#AC8498"],
    ["#F0E0D8", "#DCC8BC", "#C8B0A0", "#B49884"],
    ["#D8D4E0", "#BCB8CC", "#A09CB8", "#8480A4"],
    ["#E4D0D8", "#D0B4C0", "#BC98A8", "#A87C90"],
  ],
  "living-room": [
    ["#C8D8C4", "#ACBEA8", "#90A48C", "#748A70"],
    ["#D0D8C4", "#B8C0A8", "#A0A88C", "#889070"],
    ["#C4D0C8", "#A8B8AC", "#8CA090", "#708874"],
    ["#D4DCC8", "#BCC4AC", "#A4AC90", "#8C9474"],
    ["#C8D4CC", "#ACBCB0", "#90A494", "#748C78"],
    ["#D8DCC4", "#C0C4A8", "#A8AC8C", "#909470"],
  ],
};

const FALLBACK_TITLES: Record<Category, string[]> = {
  office: [
    "Minimal Walnut Desk Setup", "Japandi Home Office", "Industrial Loft Workspace",
    "Scandinavian Study Nook", "Mid-Century Modern Office", "Warm Neutral Workspace",
    "Concrete & Wood Studio", "Bohemian Creative Corner", "Monochrome Focus Room",
    "Architect's Drafting Room", "Cozy Cabin Office", "Modern Farmhouse Desk",
    "Art Deco Work Suite", "Minimalist White Studio", "Vintage Library Office",
    "Zen Productivity Space", "Copper & Oak Study", "Nordic Light Workspace",
    "Urban Loft Corner Desk", "Rustic Modern Office",
  ],
  bedroom: [
    "Soft Linen Retreat", "Moody Terracotta Suite", "Cloud-White Sanctuary",
    "Blush & Sage Bedroom", "Wabi-Sabi Sleep Space", "French Provincial Nook",
    "Organic Modern Bedroom", "Coastal Calm Retreat", "Layered Textile Haven",
    "Earth-Tone Cocoon", "Parisian Apartment Suite", "Desert Rose Bedroom",
    "Warm Minimalist Haven", "Vintage Velvet Room", "Scandi Cozy Bedroom",
    "Neutral Palette Retreat", "Boho Chic Sanctuary", "Japandi Sleep Space",
    "Muted Luxe Bedroom", "Cottagecore Nook",
  ],
  "living-room": [
    "Sunlit Olive Lounge", "Earthy Conversation Pit", "Modern Farmhouse Living",
    "Sage & Cream Sitting Room", "Open-Plan Garden View", "Warm Wood Living Space",
    "Botanical Living Room", "Curated Gallery Lounge", "Organic Modern Parlor",
    "Nordic Hygge Room", "Terracotta & Linen Lounge", "Vintage Eclectic Living",
    "Coastal Modern Retreat", "Artisan Living Room", "Minimalist Green Space",
    "Mid-Century Warm Lounge", "Desert Modern Living", "Woven Texture Lounge",
    "Grand Arched Salon", "Natural Light Nook",
  ],
};

const FALLBACK_SUBTITLES = [
  "Save for later", "Interior inspo", "Dream space", "Room goals",
  "Design bookmark", "Mood board add", "Home vision", "Style reference",
];

function generateFallbackPin(category: Category, index: number): Pin {
  const seed = category.charCodeAt(0) * 1000 + index;
  const r = seededRandom(seed);
  const palette = PALETTES[category][index % PALETTES[category].length];
  const aspect = 0.9 + r * 0.9;
  const title = FALLBACK_TITLES[category][index % FALLBACK_TITLES[category].length];
  const subtitle = FALLBACK_SUBTITLES[index % FALLBACK_SUBTITLES.length];

  const w = 400;
  const h = Math.round(w * aspect);
  const c1 = palette[0];
  const c2 = palette[1];
  const c3 = palette[2];
  const c4 = palette[3];

  const parts: string[] = [];
  const r1 = seededRandom(seed + 1);
  const r2 = seededRandom(seed + 2);
  const r3 = seededRandom(seed + 3);
  const r4 = seededRandom(seed + 4);
  const r5 = seededRandom(seed + 5);

  if (r1 > 0.5) {
    parts.push(`<ellipse cx="${w * 0.5}" cy="${h * 0.45}" rx="${w * 0.15 + r2 * w * 0.35}" ry="${h * 0.2 + r3 * h * 0.3}" fill="${c3}" opacity="0.5"/>`);
  } else {
    const rw = w * 0.4 + r2 * w * 0.3;
    const rh = h * 0.3 + r3 * h * 0.3;
    parts.push(`<rect x="${(w - rw) / 2}" y="${(h - rh) / 2}" width="${rw}" height="${rh}" rx="${8 + r4 * 30}" fill="${c3}" opacity="0.45"/>`);
  }
  parts.push(`<circle cx="${w * 0.2 + r4 * w * 0.6}" cy="${h * 0.2 + r5 * h * 0.6}" r="${20 + r1 * 50}" fill="${c4}" opacity="0.6"/>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="bg${index}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#bg${index})"/>${parts.join("")}</svg>`;
  return { id: `${category}-${index}`, src: `data:image/svg+xml,${encodeURIComponent(svg)}`, alt: title, aspect, title, subtitle };
}

/* ------------------------------------------------------------------ page -- */

const PER_PAGE = 20;

export default function PinterestPage() {
  const [category, setCategory] = useState<Category>("office");
  const [pins, setPins] = useState<Pin[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [usingApi, setUsingApi] = useState(true);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [likedPins, setLikedPins] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    const ids = new Set(listLikedPins().map((p) => p.id));
    setLikedPins(ids);
  }, []);

  const toggleLike = useCallback((pin: Pin) => {
    const nowLiked = toggleLikedPin({
      id: pin.id,
      title: pin.title,
      subtitle: pin.subtitle,
      src: pin.src,
      aspect: pin.aspect,
    });
    setLikedPins((prev) => {
      const next = new Set(prev);
      if (nowLiked) next.add(pin.id);
      else next.delete(pin.id);
      return next;
    });
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;

    if (usingApi) {
      const photos = await fetchUnsplashPins(category, page);
      if (photos && photos.length > 0) {
        setPins((prev) => [...prev, ...photos]);
        setPage((p) => p + 1);
        if (photos.length < PER_PAGE) setHasMore(false);
      } else if (page === 1) {
        setUsingApi(false);
        const batch = Array.from({ length: PER_PAGE }, (_, i) => generateFallbackPin(category, i));
        setPins(batch);
        setPage(2);
      } else {
        setHasMore(false);
      }
    } else {
      const start = (page - 1) * PER_PAGE;
      const batch = Array.from({ length: PER_PAGE }, (_, i) => generateFallbackPin(category, start + i));
      setPins((prev) => [...prev, ...batch]);
      setPage((p) => p + 1);
    }

    loadingRef.current = false;
  }, [category, page, hasMore, usingApi]);

  useEffect(() => {
    setPins([]);
    setPage(1);
    setHasMore(true);
    setUsingApi(true);
    loadingRef.current = false;
  }, [category]);

  useEffect(() => {
    if (pins.length === 0 && page === 1) {
      loadMore();
    }
  }, [pins.length, page, loadMore]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  useEffect(() => {
    if (selectedPin) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedPin]);

  const palette = HUE[category];

  return (
    <main className="min-h-screen" style={{ background: palette.bg, transition: "background 0.6s ease" }}>
      <Nav />

      {/* hero */}
      <section className="mx-auto max-w-[1120px] px-6 pb-8 pt-32 text-center md:pt-36">
        <h1 className="font-display text-3xl uppercase tracking-[0.08em] text-white md:text-4xl lg:text-5xl">
          Curated Inspiration
        </h1>
      </section>

      {/* category tabs — large, centered, evenly spaced */}
      <div className="mx-auto max-w-[720px] px-6 pb-8 pt-2">
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {TABS.map((tab) => {
            const active = category === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setCategory(tab.key)}
                className="relative overflow-hidden rounded-2xl px-4 py-5 text-center font-medium transition-all duration-300 md:rounded-3xl md:px-6 md:py-7"
                style={{
                  background: active ? palette.accent : "rgba(255,255,255,0.06)",
                  color: active ? "#fff" : palette.accent,
                  border: active ? `2px solid ${palette.accent}` : `2px solid ${palette.muted}33`,
                  boxShadow: active
                    ? `0 8px 32px -8px ${palette.accent}66`
                    : "0 2px 12px -4px rgba(0,0,0,0.35)",
                  transform: active ? "scale(1.02)" : "scale(1)",
                }}
              >
                <span className="flex items-center justify-center">
                  <tab.Icon color={active ? "#fff" : palette.accent} />
                </span>
                <span className="mt-2 block text-sm font-semibold tracking-wide md:text-base">
                  {tab.label}
                </span>
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute inset-x-4 bottom-2 mx-auto h-1 rounded-full bg-white/40 md:bottom-3"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* masonry feed */}
      <section className="mx-auto max-w-[1120px] px-6 pb-20 pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <MasonryGrid
              pins={pins}
              palette={palette}
              likedPins={likedPins}
              onToggleLike={toggleLike}
              onSelect={setSelectedPin}
            />
          </motion.div>
        </AnimatePresence>

        <div ref={sentinelRef} className="h-10" />

        {hasMore && (
          <div className="flex justify-center py-6">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block h-2 w-2 rounded-full"
                  style={{ background: palette.muted }}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* lightbox */}
      <AnimatePresence>
        {selectedPin && (
          <Lightbox
            pin={selectedPin}
            palette={palette}
            liked={likedPins.has(selectedPin.id)}
            onToggleLike={() => toggleLike(selectedPin)}
            onClose={() => setSelectedPin(null)}
          />
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}

/* ------------------------------------------------------------ lightbox -- */

function Lightbox({
  pin,
  palette,
  liked,
  onToggleLike,
  onClose,
}: {
  pin: Pin;
  palette: { accent: string; muted: string };
  liked: boolean;
  onToggleLike: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative flex max-h-[90vh] w-full max-w-[520px] flex-col overflow-hidden rounded-3xl bg-[#1a1a1c] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
          aria-label="Close"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="overflow-auto">
          <img
            src={pin.srcLarge || pin.src}
            alt={pin.alt}
            className="block w-full"
            style={{ aspectRatio: `1 / ${pin.aspect}` }}
          />
        </div>

        <div className="flex flex-col gap-3 p-5">
          <div>
            <h2 className="text-lg font-bold text-white">{pin.title}</h2>
            <p className="mt-0.5 text-[13px] text-white/60">{pin.subtitle}</p>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={onToggleLike}
              className="flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 active:scale-95"
              style={{
                background: liked ? "#3A1F22" : "rgba(255,255,255,0.08)",
                color: liked ? "#FF6B7A" : "#B8B5AE",
                border: liked ? "1.5px solid #5A2A2E" : "1.5px solid rgba(255,255,255,0.15)",
              }}
            >
              <Heart
                className="h-[18px] w-[18px] transition-transform duration-200"
                fill={liked ? "#E60023" : "none"}
                stroke={liked ? "#E60023" : "currentColor"}
                strokeWidth={2}
                style={{ transform: liked ? "scale(1.15)" : "scale(1)" }}
              />
              {liked ? "Liked" : "Like"}
            </button>

            <button
              className="rounded-full px-5 py-2.5 text-[13px] font-semibold text-white transition-all duration-200 active:scale-95"
              style={{
                background: palette.accent,
                boxShadow: `0 4px 16px -4px ${palette.accent}88`,
              }}
            >
              Steal this Look
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* -------------------------------------------------------- masonry grid -- */

function MasonryGrid({
  pins,
  palette,
  likedPins,
  onToggleLike,
  onSelect,
}: {
  pins: Pin[];
  palette: { accent: string; muted: string };
  likedPins: Set<string>;
  onToggleLike: (pin: Pin) => void;
  onSelect: (pin: Pin) => void;
}) {
  const cols = useColumns();
  const columns: Pin[][] = Array.from({ length: cols }, () => []);
  const heights = new Array(cols).fill(0);

  for (const pin of pins) {
    const shortest = heights.indexOf(Math.min(...heights));
    columns[shortest].push(pin);
    heights[shortest] += pin.aspect;
  }

  return (
    <div className="flex gap-4" style={{ alignItems: "flex-start" }}>
      {columns.map((col, ci) => (
        <div key={ci} className="flex flex-1 flex-col gap-4">
          {col.map((pin, pi) => (
            <PinCard
              key={pin.id}
              pin={pin}
              palette={palette}
              index={ci * 100 + pi}
              liked={likedPins.has(pin.id)}
              onToggleLike={() => onToggleLike(pin)}
              onSelect={() => onSelect(pin)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function useColumns() {
  const [cols, setCols] = useState(4);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      setCols(w < 640 ? 2 : w < 1024 ? 3 : 4);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return cols;
}

/* ------------------------------------------------------------ pin card -- */

function PinCard({
  pin,
  palette,
  index,
  liked,
  onToggleLike,
  onSelect,
}: {
  pin: Pin;
  palette: { accent: string; muted: string };
  index: number;
  liked: boolean;
  onToggleLike: () => void;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index % 8) * 0.04 }}
      className="group relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div
        className="overflow-hidden rounded-2xl lg:rounded-3xl"
        style={{
          boxShadow: hovered
            ? "0 8px 40px -12px rgba(0,0,0,0.18)"
            : "0 2px 12px -4px rgba(0,0,0,0.08)",
          transition: "box-shadow 0.35s ease, transform 0.35s ease",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
        }}
      >
        <img
          src={pin.src}
          alt={pin.alt}
          className="block w-full object-cover"
          style={{ aspectRatio: `1 / ${pin.aspect}` }}
          loading="lazy"
        />

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-end justify-between rounded-2xl p-3 lg:rounded-3xl"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 50%, rgba(0,0,0,0.1) 100%)" }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike();
                }}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur-sm transition-transform active:scale-90"
              >
                <Heart
                  className="h-4 w-4"
                  fill={liked ? "#E60023" : "none"}
                  stroke={liked ? "#E60023" : "#333"}
                  strokeWidth={2}
                />
              </button>

              <span
                className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
                style={{ background: palette.accent }}
              >
                Steal this Look
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-2 px-1">
        <p className="truncate text-[13px] font-semibold text-white">
          {pin.title}
        </p>
        <p className="text-[11px]" style={{ color: palette.muted }}>
          {pin.subtitle}
        </p>
      </div>
    </motion.div>
  );
}
