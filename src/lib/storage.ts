import type { DetectedRoom, PlacedItem, Product, RoomSpec } from "./types";

/**
 * Local persistence for saved rooms. No database required.
 *
 * Rooms live in localStorage (per browser). Share links encode the whole
 * room into the URL itself, so a plan can be sent to someone without a
 * server ever seeing it. Swap for Supabase when you want cross-device sync.
 */

const KEY = "sightline:rooms";

export interface SavedRoom {
  id: string;
  name: string;
  savedAt: number;
  spec: RoomSpec;
  detected: DetectedRoom | null;
  productIds: string[];
  /** Full product data keeps live listings available when a room is reopened. */
  products?: Product[];
  placed: PlacedItem[];
  total: number;
  layoutName: string;
}

export function listRooms(): SavedRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const rooms = JSON.parse(raw) as SavedRoom[];
    return Array.isArray(rooms) ? rooms.sort((a, b) => b.savedAt - a.savedAt) : [];
  } catch {
    return [];
  }
}

/** crypto.randomUUID() is unavailable outside a secure context and on older
 * Safari, where it throws and takes the whole save down with it. */
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `room-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function saveRoom(room: Omit<SavedRoom, "id" | "savedAt"> & { id?: string }): SavedRoom {
  const rooms = listRooms();
  const id = room.id || newId();
  const entry: SavedRoom = { ...room, id, savedAt: Date.now() };
  const next = [entry, ...rooms.filter((r) => r.id !== id)].slice(0, 50);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // quota exceeded: drop the oldest half and retry once
    try {
      localStorage.setItem(KEY, JSON.stringify(next.slice(0, Math.ceil(next.length / 2))));
    } catch {
      /* give up silently; the UI reports failure via the return value check */
    }
  }
  return entry;
}

export function getRoom(id: string): SavedRoom | null {
  return listRooms().find((r) => r.id === id) || null;
}

export function deleteRoom(id: string): void {
  const next = listRooms().filter((r) => r.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* nothing useful to do */
  }
}

/* ---------- share links ---------- */

/**
 * Compact wire form. Product ids reference the catalog, so a full room
 * fits comfortably inside a URL.
 */
interface Wire {
  n: string;
  s: RoomSpec;
  d: DetectedRoom | null;
  p: [string, number, number, number, string][];
  t: number;
  l: string;
}

export function encodeRoom(room: Pick<SavedRoom, "name" | "spec" | "detected" | "placed" | "total" | "layoutName">): string {
  const wire: Wire = {
    n: room.name,
    s: room.spec,
    d: room.detected,
    p: room.placed.map((x) => [x.productId, round(x.x), round(x.y), x.rotation, x.fit]),
    t: room.total,
    l: room.layoutName
  };
  return toBase64Url(JSON.stringify(wire));
}

export function decodeRoom(token: string): Pick<SavedRoom, "name" | "spec" | "detected" | "placed" | "total" | "layoutName"> | null {
  try {
    const wire = JSON.parse(fromBase64Url(token)) as Wire;
    if (!wire?.s || !Array.isArray(wire.p)) return null;
    return {
      name: wire.n,
      spec: wire.s,
      detected: wire.d,
      total: wire.t,
      layoutName: wire.l,
      placed: wire.p.map(([productId, x, y, rotation, fit]) => ({
        productId,
        x,
        y,
        rotation,
        fit: fit as PlacedItem["fit"],
        rationale: []
      }))
    };
  } catch {
    return null;
  }
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  const bin = atob(b64 + pad);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ---------- liked Pinterest pins ---------- */

const LIKED_KEY = "sightline:liked-pins";

export interface LikedPin {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  aspect: number;
  likedAt: number;
}

export function listLikedPins(): LikedPin[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIKED_KEY);
    if (!raw) return [];
    const pins = JSON.parse(raw) as LikedPin[];
    return Array.isArray(pins) ? pins.sort((a, b) => b.likedAt - a.likedAt) : [];
  } catch {
    return [];
  }
}

export function toggleLikedPin(pin: Omit<LikedPin, "likedAt">): boolean {
  const pins = listLikedPins();
  const exists = pins.some((p) => p.id === pin.id);
  const next = exists
    ? pins.filter((p) => p.id !== pin.id)
    : [{ ...pin, likedAt: Date.now() }, ...pins].slice(0, 200);
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify(next));
  } catch {
    /* quota exceeded */
  }
  return !exists;
}

export function isLikedPin(id: string): boolean {
  return listLikedPins().some((p) => p.id === id);
}

export function removeLikedPin(id: string): void {
  const next = listLikedPins().filter((p) => p.id !== id);
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify(next));
  } catch {
    /* nothing useful to do */
  }
}

/**
 * A "stolen" or hearted Pinterest look, handed off to the capture flow so its
 * palette/style/search-terms pre-fill Brief's Inspiration box and shape the
 * very first live scraper search -- same mechanism as pasting a Pinterest
 * link there, just entered from the Pinterest tab or Your Rooms instead.
 * Session-scoped: it's a one-time handoff, not something to persist.
 */
const STOLEN_LOOK_KEY = "sightline:stolenLook";

export function saveStolenLook(look: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STOLEN_LOOK_KEY, JSON.stringify(look));
  } catch {
    /* quota exceeded */
  }
}

export function takeStolenLook<T = { pinImage: string; vibe: unknown }>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STOLEN_LOOK_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STOLEN_LOOK_KEY);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
