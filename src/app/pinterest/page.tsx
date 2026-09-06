"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Search, X } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { toggleLikedPin, listLikedPins } from "@/lib/storage";
import { LookLightbox } from "@/components/pinterest/LookLightbox";
import { SafeImage } from "@/components/SafeImage";

/* ------------------------------------------------------------------ data -- */

type Room = "any" | "office" | "bedroom" | "bathroom" | "living-room";

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

/**
 * Room and vibe are two independent axes and they combine: pick Bathroom, type
 * "japandi", get japandi bathrooms. Either one works on its own — "Any room"
 * plus a vibe searches that vibe across every kind of space.
 */
const ROOMS: { key: Room; label: string; noun: string }[] = [
  { key: "any", label: "Any room", noun: "Space" },
  { key: "bedroom", label: "Bedroom", noun: "Bedroom" },
  { key: "bathroom", label: "Bathroom", noun: "Bathroom" },
  { key: "office", label: "Office", noun: "Office" },
  { key: "living-room", label: "Living room", noun: "Living Room" }
];

/** One tap to a vibe, for anyone who'd rather not think of one. */
const VIBES = [
  "Japandi",
  "Warm minimal",
  "Mid-century",
  "Wabi-sabi",
  "Dark academia",
  "Coastal",
  "Industrial",
  "Boho",
  "Scandi"
];

/* ---- Unsplash API fetch ---- */

async function fetchUnsplashPins(room: Room, vibe: string, page: number): Promise<Pin[] | null> {
  try {
    const params = new URLSearchParams({ room, page: String(page), per_page: "20" });
    if (vibe) params.set("q", vibe);

    const res = await fetch(`/api/unsplash?${params.toString()}`);
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
        photographer: p.photographer
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

/** Warm neutrals off the site palette, so a keyless feed still looks like us. */
const PALETTES: Record<Room, string[][]> = {
  any: [
    ["#E8E3D9", "#D0C8B8", "#B8AE9A", "#9E9280"],
    ["#E4DED2", "#CCC2B0", "#B4A892", "#9C8E76"],
    ["#EDE8DE", "#D6CEC0", "#BFB4A2", "#A89A84"],
    ["#E0DACE", "#C8BFAC", "#B0A48E", "#988A70"],
    ["#EAE4D8", "#D2CABA", "#BAB09C", "#A2967E"],
    ["#E6E0D4", "#CEC5B4", "#B6AB96", "#9E9178"]
  ],
  office: [
    ["#D4C5A9", "#B8A88A", "#9C8B6E", "#7A6F5A"],
    ["#C9D6D9", "#A3B5BA", "#7D949C", "#5A757E"],
    ["#E8DCC8", "#D1C4A8", "#BAAC88", "#A39468"],
    ["#D6CFC4", "#BFB5A6", "#A89B88", "#91816A"],
    ["#C4CCD0", "#A8B4BA", "#8C9CA4", "#70848E"],
    ["#E0D4C0", "#CCBDA4", "#B8A688", "#A48F6C"]
  ],
  bedroom: [
    ["#E8D4D4", "#D4B8B8", "#C09C9C", "#AC8080"],
    ["#D4D0E8", "#B8B4D4", "#9C98C0", "#807CAC"],
    ["#E8D8E0", "#D4BCC8", "#C0A0B0", "#AC8498"],
    ["#F0E0D8", "#DCC8BC", "#C8B0A0", "#B49884"],
    ["#D8D4E0", "#BCB8CC", "#A09CB8", "#8480A4"],
    ["#E4D0D8", "#D0B4C0", "#BC98A8", "#A87C90"]
  ],
  bathroom: [
    ["#DDE4E4", "#C0CBCB", "#A2B0B0", "#849494"],
    ["#E4E2DC", "#C8C4BA", "#ACA698", "#908876"],
    ["#D8E0DE", "#BAC6C3", "#9CACA8", "#7E928D"],
    ["#EAE6E0", "#D0CABF", "#B6AE9E", "#9C927D"],
    ["#DCE2E8", "#BEC8D0", "#A0AEB8", "#8294A0"],
    ["#E6E4DE", "#CAC6BC", "#AEA89A", "#928A78"]
  ],
  "living-room": [
    ["#C8D8C4", "#ACBEA8", "#90A48C", "#748A70"],
    ["#D0D8C4", "#B8C0A8", "#A0A88C", "#889070"],
    ["#C4D0C8", "#A8B8AC", "#8CA090", "#708874"],
    ["#D4DCC8", "#BCC4AC", "#A4AC90", "#8C9474"],
    ["#C8D4CC", "#ACBCB0", "#90A494", "#748C78"],
    ["#D8DCC4", "#C0C4A8", "#A8AC8C", "#909470"]
  ]
};

const FALLBACK_TITLES: Record<Room, string[]> = {
  any: [
    "Sunlit Plaster Room", "Quiet Material Study", "Warm Neutral Interior",
    "Open Arched Space", "Linen & Oak Room", "Soft Shadow Study",
    "Earth-Tone Interior", "Clay and Timber Space", "Still Life Corner",
    "Muted Modern Room", "Textured Wall Study", "Low Winter Light",
    "Pared-Back Interior", "Lime-Wash Room", "Honest Materials Space",
    "Slow Morning Interior", "Raw Timber Corner", "Bone & Ochre Room",
    "Considered Empty Space", "Long Light Interior"
  ],
  office: [
    "Minimal Walnut Desk Setup", "Japandi Home Office", "Industrial Loft Workspace",
    "Scandinavian Study Nook", "Mid-Century Modern Office", "Warm Neutral Workspace",
    "Concrete & Wood Studio", "Bohemian Creative Corner", "Monochrome Focus Room",
    "Architect's Drafting Room", "Cozy Cabin Office", "Modern Farmhouse Desk",
    "Art Deco Work Suite", "Minimalist White Studio", "Vintage Library Office",
    "Zen Productivity Space", "Copper & Oak Study", "Nordic Light Workspace",
    "Urban Loft Corner Desk", "Rustic Modern Office"
  ],
  bedroom: [
    "Soft Linen Retreat", "Moody Terracotta Suite", "Cloud-White Sanctuary",
    "Blush & Sage Bedroom", "Wabi-Sabi Sleep Space", "French Provincial Nook",
    "Organic Modern Bedroom", "Coastal Calm Retreat", "Layered Textile Haven",
    "Earth-Tone Cocoon", "Parisian Apartment Suite", "Desert Rose Bedroom",
    "Warm Minimalist Haven", "Vintage Velvet Room", "Scandi Cozy Bedroom",
    "Neutral Palette Retreat", "Boho Chic Sanctuary", "Japandi Sleep Space",
    "Muted Luxe Bedroom", "Cottagecore Nook"
  ],
  bathroom: [
    "Travertine Wet Room", "Micro-Cement Bathroom", "Japandi Soaking Tub",
    "Limewash Powder Room", "Marble & Brass Ensuite", "Sculptural Stone Basin",
    "Warm Terracotta Bath", "Nordic Spa Bathroom", "Arched Shower Nook",
    "Zellige Tile Bathroom", "Blackened Steel Ensuite", "Quiet Ceramic Study",
    "Timber & Stone Wet Room", "Minimal Concrete Bath", "Vintage Clawfoot Room",
    "Coastal Plaster Bathroom", "Slate Floor Ensuite", "Ochre Tile Powder Room",
    "Onsen-Inspired Bath", "Pared-Back Washroom"
  ],
  "living-room": [
    "Sunlit Olive Lounge", "Earthy Conversation Pit", "Modern Farmhouse Living",
    "Sage & Cream Sitting Room", "Open-Plan Garden View", "Warm Wood Living Space",
    "Botanical Living Room", "Curated Gallery Lounge", "Organic Modern Parlor",
    "Nordic Hygge Room", "Terracotta & Linen Lounge", "Vintage Eclectic Living",
    "Coastal Modern Retreat", "Artisan Living Room", "Minimalist Green Space",
    "Mid-Century Warm Lounge", "Desert Modern Living", "Woven Texture Lounge",
    "Grand Arched Salon", "Natural Light Nook"
  ]
};

const FALLBACK_SUBTITLES = [
  "Save for later", "Interior inspo", "Dream space", "Room goals",
  "Design bookmark", "Mood board add", "Home vision", "Style reference"
];

function titleCase(s: string) {
  return s.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

/**
 * With no API key the feed still has to fill. A searched vibe names the pin so
 * the fallback reflects what was asked for rather than a fixed list.
 */
function generateFallbackPin(room: Room, vibe: string, index: number): Pin {
  const key = `${room}|${vibe}`;
  let seed = index * 31;
  for (let i = 0; i < key.length; i++) seed += key.charCodeAt(i) * (i + 7);

  const r = seededRandom(seed);
  const palette = PALETTES[room][index % PALETTES[room].length];
  const aspect = 0.9 + r * 0.9;

  const noun = ROOMS.find((x) => x.key === room)?.noun ?? "Space";
  const title = vibe
    ? `${titleCase(vibe)} ${noun}`
    : FALLBACK_TITLES[room][index % FALLBACK_TITLES[room].length];
  const subtitle = FALLBACK_SUBTITLES[index % FALLBACK_SUBTITLES.length];

  const w = 400;
  const h = Math.round(w * aspect);
  const [c1, c2, c3, c4] = palette;

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
    parts.push(`<rect x="${(w - rw) / 2}" y="${(h - rh) / 2}" width="${rw}" height="${rh}" fill="${c3}" opacity="0.45"/>`);
  }
  parts.push(`<circle cx="${w * 0.2 + r4 * w * 0.6}" cy="${h * 0.2 + r5 * h * 0.6}" r="${20 + r1 * 50}" fill="${c4}" opacity="0.6"/>`);

  const gid = `bg-${room}-${index}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#${gid})"/>${parts.join("")}</svg>`;

  return {
    id: `${room}-${vibe || "all"}-${index}`,
    src: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    alt: title,
    aspect,
    title,
    subtitle
  };
}

/* ------------------------------------------------------------------ page -- */

const PER_PAGE = 20;

export default function PinterestPage() {
  const [room, setRoom] = useState<Room>("any");
  const [vibe, setVibe] = useState("");       // the submitted search
  const [input, setInput] = useState("");     // what's in the field right now

  const [pins, setPins] = useState<Pin[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [usingApi, setUsingApi] = useState(true);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [likedPins, setLikedPins] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    setLikedPins(new Set(listLikedPins().map((p) => p.id)));
  }, []);

  const toggleLike = useCallback((pin: Pin) => {
    const nowLiked = toggleLikedPin({
      id: pin.id,
      title: pin.title,
      subtitle: pin.subtitle,
      src: pin.src,
      aspect: pin.aspect
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
      const photos = await fetchUnsplashPins(room, vibe, page);
      if (photos && photos.length > 0) {
        setPins((prev) => [...prev, ...photos]);
        setPage((p) => p + 1);
        if (photos.length < PER_PAGE) setHasMore(false);
      } else if (page === 1) {
        // No key, or the search came back empty — draw the feed locally.
        setUsingApi(false);
        setPins(Array.from({ length: PER_PAGE }, (_, i) => generateFallbackPin(room, vibe, i)));
        setPage(2);
      } else {
        setHasMore(false);
      }
    } else {
      const start = (page - 1) * PER_PAGE;
      setPins((prev) => [
        ...prev,
        ...Array.from({ length: PER_PAGE }, (_, i) => generateFallbackPin(room, vibe, start + i))
      ]);
      setPage((p) => p + 1);
    }

    loadingRef.current = false;
  }, [room, vibe, page, hasMore, usingApi]);

  // Either axis changing starts the feed over.
  useEffect(() => {
    setPins([]);
    setPage(1);
    setHasMore(true);
    setUsingApi(true);
    loadingRef.current = false;
  }, [room, vibe]);

  useEffect(() => {
    if (pins.length === 0 && page === 1) loadMore();
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
    document.body.style.overflow = selectedPin ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedPin]);

  /* Submitting is explicit — Enter or the button. A live search would spend an
     Unsplash key's hourly allowance on half-typed words. */
  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setVibe(input.trim());
  }

  function pickVibe(v: string) {
    setInput(v);
    setVibe(v);
  }

  function clearVibe() {
    setInput("");
    setVibe("");
  }

  const roomLabel = ROOMS.find((r) => r.key === room)?.label ?? "Any room";

  return (
    <main className="min-h-screen">
      <Nav />

      {/* hero */}
      <section className="mx-auto max-w-[1120px] px-6 pb-8 pt-32 text-center md:pt-36">
        <p className="eyebrow mb-4">Curated Inspiration</p>
        <h1 className="display-xl text-[clamp(40px,7vw,76px)]">Ideas</h1>
        <p className="caption mx-auto mt-5 max-w-md normal-case tracking-[0.08em]">
          Search a vibe, pick a room, or do both. Save what speaks to you and let
          your next space take shape.
        </p>
      </section>

      {/* ---------------------------------------------- vibe search + rooms -- */}
      <div className="mx-auto max-w-[820px] px-6 pb-10">
        <form onSubmit={submit} className="flex items-stretch border border-ink">
          <span className="grid w-12 shrink-0 place-items-center text-ash">
            <Search className="h-4 w-4" />
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={60}
            aria-label="Search a vibe"
            placeholder="Search a vibe — japandi, warm minimal, dark academia…"
            className="wordmark min-w-0 flex-1 bg-transparent py-4 text-[15px] text-ink outline-none placeholder:text-ash/70"
          />
          {input && (
            <button
              type="button"
              onClick={clearVibe}
              aria-label="Clear search"
              className="grid w-11 shrink-0 place-items-center text-ash transition-colors duration-300 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button type="submit" className="btn btn-primary shrink-0 border-l px-6 py-4">
            Search
          </button>
        </form>

        {/* one-tap vibes */}
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {VIBES.map((v) => {
            const active = vibe.toLowerCase() === v.toLowerCase();
            return (
              <button
                key={v}
                onClick={() => (active ? clearVibe() : pickVibe(v))}
                aria-pressed={active}
                className={`nav-link border px-3 py-2 transition-colors duration-500 ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ash hover:border-ink hover:text-ink"
                }`}
              >
                {v}
              </button>
            );
          })}
        </div>

        {/* rooms */}
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {ROOMS.map((r) => {
            const active = room === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setRoom(r.key)}
                aria-pressed={active}
                className={`nav-link border px-3 py-4 text-center transition-colors duration-500 ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule text-ink hover:border-ink"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>

        {/* what you're looking at */}
        <p className="eyebrow mt-6 text-center">
          {vibe ? `${vibe} · ${roomLabel}` : roomLabel}
          {!usingApi && " · offline preview"}
        </p>
      </div>

      {/* masonry feed */}
      <section className="mx-auto max-w-[1120px] px-6 pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${room}|${vibe}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <MasonryGrid
              pins={pins}
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
                  className="block h-1.5 w-1.5 bg-ash"
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}

        {!hasMore && pins.length === 0 && (
          <p className="caption py-16 text-center normal-case tracking-[0.08em]">
            Nothing came back for that one. Try a different vibe.
          </p>
        )}
      </section>

      {/* lightbox */}
      <AnimatePresence>
        {selectedPin && (
          <LookLightbox
            pin={selectedPin}
            room={room}
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

/* -------------------------------------------------------- masonry grid -- */

function MasonryGrid({
  pins,
  likedPins,
  onToggleLike,
  onSelect
}: {
  pins: Pin[];
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
  index,
  liked,
  onToggleLike,
  onSelect
}: {
  pin: Pin;
  index: number;
  liked: boolean;
  onToggleLike: () => void;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: (index % 8) * 0.04, ease: [0.22, 0.61, 0.36, 1] }}
      className="group relative cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      <div
        className="relative overflow-hidden border transition-colors duration-500"
        style={{ borderColor: hovered ? "rgb(var(--ink))" : "rgb(var(--rule))" }}
      >
        <SafeImage
          src={pin.src}
          alt={pin.alt}
          label={pin.title}
          className="block w-full object-cover"
          style={{ aspectRatio: `1 / ${pin.aspect}` }}
        />

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 flex items-end justify-between p-3"
              style={{ background: "linear-gradient(to top, rgba(10,9,8,0.55) 0%, rgba(10,9,8,0.05) 55%, rgba(10,9,8,0.10) 100%)" }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLike();
                }}
                aria-label={liked ? "Unlike" : "Like"}
                aria-pressed={liked}
                className="grid h-9 w-9 place-items-center border border-white/70 bg-black/20 text-white backdrop-blur-sm transition-colors duration-300 hover:bg-white hover:text-ink"
              >
                <Heart
                  className="h-4 w-4"
                  fill={liked ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth={1.6}
                />
              </button>

              <span className="btn btn-ondark px-4 py-2">Steal this Look</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-2.5">
        <p className="wordmark truncate text-[14px] text-ink">{pin.title}</p>
        <p className="eyebrow mt-1 text-[10px]">{pin.subtitle}</p>
      </div>
    </motion.div>
  );
}
