export type Source = "amazon" | "facebook" | "target" | "wayfair" | "ikea";

export type Category =
  | "sofa"
  | "chair"
  | "table"
  | "bed"
  | "rug"
  | "lamp"
  | "shelf"
  | "plant"
  | "art";

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
  reviewCount?: number;
  availability?: "in-stock" | "limited" | "preorder" | "sold" | "unknown";
  /** A concise explanation of the item's practical role in the room. */
  summary?: string;
  vibe?: string[];
}

export interface RoomSpec {
  widthFt: number;
  depthFt: number;
  budget: number;
  style: string;
  mustHave: Category[];
}

export interface PlacedItem {
  productId: string;
  x: number;
  y: number;
  rotation: number;
}
