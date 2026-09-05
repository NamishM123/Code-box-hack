export type Source = "amazon" | "facebook" | "target" | "wayfair" | "ikea" | "westelm" | "cb2" | "article" | "other";

export type Category =
  | "sofa" | "chair" | "table" | "bed" | "rug" | "lamp" | "shelf" | "plant" | "art" | "desk" | "dresser" | "nightstand" | "mirror";

export type RoomType = "living" | "bedroom" | "office" | "studio";

export type Goal = "functional" | "storage" | "seating" | "refresh" | "sleep" | "work";

export interface Product {
  id: string;
  title: string;
  price: number;
  source: Source;
  url: string;
  image: string;
  category: Category;
  color: string;
  width: number;
  depth: number;
  height: number;
  rating?: number;
  material?: string;
  vibe?: string[];
  /** False when dimensions were inferred from the category rather than the listing. */
  dimensionsVerified?: boolean;
  location?: string;
}

export interface RoomSpec {
  widthFt: number;
  depthFt: number;
  budget: number;
  style: string;
  mustHave: Category[];
  roomType?: RoomType;
  goal?: Goal;
  vibePalette?: string[];
  vibeTags?: string[];
}

export interface Opening {
  wall: "N" | "S" | "E" | "W";
  positionFt: number;
  widthFt: number;
  kind: "door" | "window";
  swingFt?: number;
}

export interface DetectedRoom {
  widthFt: number;
  depthFt: number;
  openings: Opening[];
  existing: { category: Category; label: string; x: number; y: number; widthFt: number; depthFt: number; fixed?: boolean }[];
  confidence: number;
  palette: string[];
  lightingNote: string;
}

export interface PlacedItem {
  productId: string;
  x: number;
  y: number;
  rotation: number;
  fit: FitVerdict;
  rationale: string[];
}

export type FitVerdict = "fits" | "tight" | "conflict" | "unverified";

export interface LayoutOption {
  id: string;
  name: string;
  method: string;
  placed: PlacedItem[];
  score: number;
  notes: string[];
}
