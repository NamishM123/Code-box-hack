import type { Product } from "./types";

export const SAMPLE_CATALOG: Product[] = [
  {
    id: "sofa-linen-01",
    title: "Belden Linen 3-Seater Sofa",
    price: 649,
    source: "facebook",
    url: "https://facebook.com/marketplace",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900&q=80&auto=format&fit=crop",
    category: "sofa",
    color: "#d7c9b4",
    width: 6.5, depth: 3.2, height: 2.8,
    rating: 4.6, reviewCount: 18, availability: "limited", summary: "A full-size secondhand sofa that anchors a relaxed living area without the cost of buying new.", vibe: ["warm", "minimal"]
  },
  {
    id: "sofa-boucle-01",
    title: "Cloud Boucle Modular Sofa",
    price: 1290,
    source: "amazon",
    url: "https://amazon.com",
    image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900&q=80&auto=format&fit=crop",
    category: "sofa",
    color: "#f0ead9",
    width: 7.2, depth: 3.6, height: 2.6,
    rating: 4.8, reviewCount: 1240, availability: "in-stock", summary: "A deep modular sofa built for lounging; its low profile keeps a larger seating piece visually calm.", vibe: ["cozy", "modern"]
  },
  {
    id: "chair-arch-01",
    title: "Arch Accent Chair — Camel Leather",
    price: 349,
    source: "target",
    url: "https://target.com",
    image: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900&q=80&auto=format&fit=crop",
    category: "chair",
    color: "#b57a4d",
    width: 2.6, depth: 2.8, height: 2.9,
    rating: 4.4, reviewCount: 286, availability: "in-stock", summary: "A compact accent seat that rounds out a conversation area and adds warm contrast.", vibe: ["warm"]
  },
  {
    id: "chair-wishbone-01",
    title: "Wishbone Oak Dining Chair",
    price: 129,
    source: "ikea",
    url: "https://ikea.com",
    image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=900&q=80&auto=format&fit=crop",
    category: "chair",
    color: "#c9a874",
    width: 1.7, depth: 1.7, height: 3.0,
    rating: 4.3, reviewCount: 512, availability: "in-stock"
  },
  {
    id: "table-oak-01",
    title: "Round Oak Coffee Table",
    price: 219,
    source: "wayfair",
    url: "https://wayfair.com",
    image: "https://images.unsplash.com/photo-1533090481720-856c6e3c1fdc?w=900&q=80&auto=format&fit=crop",
    category: "table",
    color: "#a67b4d",
    width: 3.2, depth: 3.2, height: 1.4,
    rating: 4.5, reviewCount: 346, availability: "in-stock"
  },
  {
    id: "table-marble-01",
    title: "Travertine Side Table",
    price: 179,
    source: "facebook",
    url: "https://facebook.com/marketplace",
    image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=900&q=80&auto=format&fit=crop",
    category: "table",
    color: "#e6ddc9",
    width: 1.4, depth: 1.4, height: 1.6,
    rating: 4.7, reviewCount: 9, availability: "limited", summary: "A small secondhand side table for an open spot beside a chair or sofa."
  },
  {
    id: "rug-jute-01",
    title: "Handwoven Jute Area Rug 8x10",
    price: 189,
    source: "amazon",
    url: "https://amazon.com",
    image: "https://images.unsplash.com/photo-1600166898405-da9535204843?w=900&q=80&auto=format&fit=crop",
    category: "rug",
    color: "#d6c39a",
    width: 8, depth: 10, height: 0.05,
    rating: 4.5, reviewCount: 2410, availability: "in-stock"
  },
  {
    id: "lamp-arc-01",
    title: "Brass Arc Floor Lamp",
    price: 149,
    source: "target",
    url: "https://target.com",
    image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=900&q=80&auto=format&fit=crop",
    category: "lamp",
    color: "#c5a15a",
    width: 1.5, depth: 1.5, height: 6.2,
    rating: 4.6, reviewCount: 389, availability: "in-stock"
  },
  {
    id: "shelf-walnut-01",
    title: "Walnut 4-Tier Bookshelf",
    price: 259,
    source: "wayfair",
    url: "https://wayfair.com",
    image: "https://images.unsplash.com/photo-1594620302200-9a762244a156?w=900&q=80&auto=format&fit=crop",
    category: "shelf",
    color: "#6b4a34",
    width: 3.2, depth: 1.2, height: 5.8,
    rating: 4.4, reviewCount: 173, availability: "limited"
  },
  {
    id: "plant-fiddle-01",
    title: "Fiddle Leaf Fig (5 ft)",
    price: 79,
    source: "amazon",
    url: "https://amazon.com",
    image: "https://images.unsplash.com/photo-1509937528035-ad76254b0356?w=900&q=80&auto=format&fit=crop",
    category: "plant",
    color: "#3f5a2a",
    width: 2.5, depth: 2.5, height: 5.2,
    rating: 4.2, reviewCount: 802, availability: "in-stock"
  },
  {
    id: "art-abstract-01",
    title: "Abstract Ochre Print — Framed",
    price: 89,
    source: "target",
    url: "https://target.com",
    image: "https://images.unsplash.com/photo-1549887534-1541e9326642?w=900&q=80&auto=format&fit=crop",
    category: "art",
    color: "#c98b6b",
    width: 2.5, depth: 0.1, height: 3.2,
    rating: 4.7, reviewCount: 418, availability: "in-stock"
  },
  {
    id: "bed-oak-01",
    title: "Low Platform Oak Bed — Queen",
    price: 899,
    source: "facebook",
    url: "https://facebook.com/marketplace",
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80&auto=format&fit=crop",
    category: "bed",
    color: "#b78b5e",
    width: 6.5, depth: 8.5, height: 2.2,
    rating: 4.6, reviewCount: 14, availability: "limited", summary: "A queen bed frame that establishes the sleep zone; allow clear circulation on both sides."
  }
];
