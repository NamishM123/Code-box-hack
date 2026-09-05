"use client";
import { useMemo, useRef, useState } from "react";
import type { PlacedItem, Product, RoomSpec } from "@/lib/types";

interface Props {
  room: RoomSpec;
  products: Product[];
  placed: PlacedItem[];
  onChange: (next: PlacedItem[]) => void;
}

export function TopView({ room, products, placed, onChange }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const PX_PER_FT = 32;

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const W = room.widthFt * PX_PER_FT;
  const D = room.depthFt * PX_PER_FT;

  function onMove(e: React.MouseEvent) {
    if (!dragging || !wrap.current) return;
    const rect = wrap.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / PX_PER_FT;
    const y = (e.clientY - rect.top) / PX_PER_FT;
    onChange(placed.map((p) => (p.productId === dragging ? { ...p, x, y } : p)));
  }

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-black/50">Top view · drag to rearrange</div>
        <div className="text-xs text-black/50">{room.widthFt}&apos; × {room.depthFt}&apos;</div>
      </div>
      <div className="overflow-auto">
        <div
          ref={wrap}
          onMouseMove={onMove}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
          className="relative mx-auto rounded-xl border border-black/10 bg-[repeating-linear-gradient(0deg,#eae2d3_0_1px,transparent_1px_32px),repeating-linear-gradient(90deg,#eae2d3_0_1px,transparent_1px_32px)] bg-cream"
          style={{ width: W, height: D }}
        >
          {placed.map((p) => {
            const prod = byId[p.productId];
            if (!prod) return null;
            const w = prod.width * PX_PER_FT;
            const h = prod.depth * PX_PER_FT;
            return (
              <div
                key={p.productId}
                onMouseDown={() => setDragging(p.productId)}
                className="group absolute -translate-x-1/2 -translate-y-1/2 cursor-grab select-none rounded-md border border-black/20 shadow-sm active:cursor-grabbing"
                style={{
                  left: p.x * PX_PER_FT,
                  top: p.y * PX_PER_FT,
                  width: w,
                  height: h,
                  background: prod.color,
                  transform: `translate(-50%, -50%) rotate(${p.rotation}deg)`
                }}
                title={prod.title}
              >
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium text-black/60">
                  {prod.category}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
