"use client";
import { useMemo, useRef, useState } from "react";
import type { DetectedRoom, PlacedItem, Product, RoomSpec } from "@/lib/types";
import { feet } from "@/lib/utils";

interface Props {
  room: RoomSpec;
  detected?: DetectedRoom | null;
  products: Product[];
  placed: PlacedItem[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChange: (next: PlacedItem[]) => void;
}

export function TopView({ room, detected, products, placed, selectedId, onSelect, onChange }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const PX = 30;

  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const W = room.widthFt * PX;
  const D = room.depthFt * PX;

  function move(e: React.MouseEvent) {
    if (!dragging || !wrap.current) return;
    const rect = wrap.current.getBoundingClientRect();
    const x = Math.max(0.5, Math.min(room.widthFt - 0.5, (e.clientX - rect.left) / PX));
    const y = Math.max(0.5, Math.min(room.depthFt - 0.5, (e.clientY - rect.top) / PX));
    onChange(placed.map((p) => (p.productId === dragging ? { ...p, x, y } : p)));
  }

  function rotate(id: string) {
    onChange(placed.map((p) => (p.productId === id ? { ...p, rotation: (p.rotation + 45) % 360 } : p)));
  }

  const door = detected?.openings.find((o) => o.kind === "door");
  const window = detected?.openings.find((o) => o.kind === "window");

  const doorPos = door ? wallPos(door.wall, door.positionFt, door.widthFt, room) : null;
  const windowPos = window ? wallPos(window.wall, window.positionFt, window.widthFt, room) : null;

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-rule px-4 py-3">
        <div className="eyebrow">
          Top view
          <span className="ml-3 normal-case tracking-normal text-ash/70">
            Drag to move, click to select, double-click to rotate
          </span>
        </div>
        <div className="eyebrow shrink-0">{feet(room.widthFt)} × {feet(room.depthFt)}</div>
      </div>
      <div className="overflow-auto p-4">
        <div
          ref={wrap}
          onMouseMove={move}
          onMouseUp={() => setDragging(null)}
          onMouseLeave={() => setDragging(null)}
          onClick={(e) => e.target === wrap.current && onSelect(null)}
          className="relative mx-auto rounded-xl border border-rule-strong"
          style={{
            width: W,
            height: D,
            background: [
              "repeating-linear-gradient(0deg,rgba(255,255,255,0.055) 0 1px,transparent 1px 30px)",
              "repeating-linear-gradient(90deg,rgba(255,255,255,0.055) 0 1px,transparent 1px 30px)",
              "rgb(var(--panel))"
            ].join(", ")
          }}
        >
          {/* door swing */}
          {doorPos && (
            <div className="hatch absolute" style={{
              left: doorPos.x * PX - 3.2 * PX, top: doorPos.y * PX - 3.2 * PX,
              width: 6.4 * PX, height: 6.4 * PX, borderRadius: "50%", clipPath: "inset(50% 0 0 50%)"
            }} title="Door swing" />
          )}
          {doorPos && (
            <div className="absolute rounded-sm bg-brass" style={{ left: doorPos.x * PX - (door!.widthFt * PX) / 2, top: doorPos.y * PX - 2, width: door!.widthFt * PX, height: 4 }} />
          )}
          {windowPos && (
            <div className="absolute rounded-sm bg-ocean" style={{ left: windowPos.x * PX - (window!.widthFt * PX) / 2, top: windowPos.y * PX - 2, width: window!.widthFt * PX, height: 4 }} title="Window" />
          )}
          {/* existing furniture (dashed) */}
          {(detected?.existing || []).map((e, i) => (
            <div key={i} className="absolute rounded-md border border-dashed border-ash/50" style={{
              left: e.x * PX - (e.widthFt * PX) / 2, top: e.y * PX - (e.depthFt * PX) / 2,
              width: e.widthFt * PX, height: e.depthFt * PX
            }}>
              <div className="pointer-events-none flex h-full items-center justify-center text-[10px] uppercase text-ash/70">{e.label}</div>
            </div>
          ))}
          {/* placed */}
          {placed.map((p) => {
            const prod = byId[p.productId];
            if (!prod) return null;
            const w = prod.width * PX, h = prod.depth * PX;
            const selected = selectedId === p.productId;
            const border = p.fit === "conflict" ? "#ef4444" : p.fit === "tight" ? "#f59e0b" : selected ? "rgb(var(--butter))" : "rgba(12,12,13,0.35)";
            return (
              <div
                key={p.productId}
                onMouseDown={() => { setDragging(p.productId); onSelect(p.productId); }}
                onDoubleClick={() => rotate(p.productId)}
                className="group absolute cursor-grab select-none rounded-md shadow-[0_10px_22px_-16px_rgba(12,12,13,0.7)] active:cursor-grabbing"
                style={{
                  left: p.x * PX - w / 2, top: p.y * PX - h / 2, width: w, height: h,
                  background: prod.color, border: `1.5px solid ${border}`,
                  transform: `rotate(${p.rotation}deg)`
                }}
                title={`${prod.title} · ${p.fit}`}
              >
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-medium"
                  style={{ color: labelOn(prod.color) }}
                >
                  {prod.category}
                </div>
              </div>
            );
          })}
          {/* room labels */}
          <div className="pointer-events-none absolute left-1 top-1 text-[10px] uppercase tracking-widest text-ash/60">N</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Catalog fills range from near-black to bone, so a single label colour cannot
 * work on all of them. Picks black or white by the fill's relative luminance,
 * the same test used for a contrast ratio.
 */
function labelOn(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "rgba(0,0,0,0.72)";
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  return L > 0.4 ? "rgba(0,0,0,0.78)" : "rgba(255,255,255,0.9)";
}

function wallPos(wall: string, positionFt: number, widthFt: number, room: RoomSpec) {
  if (wall === "N") return { x: positionFt + widthFt / 2, y: 0 };
  if (wall === "S") return { x: positionFt + widthFt / 2, y: room.depthFt };
  if (wall === "W") return { x: 0, y: positionFt + widthFt / 2 };
  return { x: room.widthFt, y: positionFt + widthFt / 2 };
}
