"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { useMemo } from "react";
import type { DetectedRoom, PlacedItem, Product, RoomSpec } from "@/lib/types";
import { StudioEnvironment } from "./furniture/StudioEnvironment";
import { RoomShell } from "./furniture/RoomShell";

interface Props {
  room: RoomSpec;
  detected?: DetectedRoom | null;
  products: Product[];
  placed: PlacedItem[];
  selectedId: string | null;
}

export function RoomScene({ room, detected, products, placed, selectedId }: Props) {
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  // The palette read off the inspiration picture, most dominant colour first.
  // Walls take a light tone from it and the floor a darker one, so the room
  // reads as the same space the picture showed rather than a default box.
  const { wallColor, floorColor } = useMemo(() => {
    const hex = (c?: string) => (c && /^#[0-9a-f]{6}$/i.test(c) ? c : null);

    // What the picture actually said, when it said anything. Guessing from the
    // palette gets a green feature wall wrong — the brightest swatch is the
    // trim, not the wall — so a read value always wins.
    const read = { wall: hex(detected?.wallColor), floor: hex(detected?.floorColor) };
    if (read.wall && read.floor) return { wallColor: read.wall, floorColor: read.floor };

    const palette = (detected?.palette || []).filter((c) => hex(c));
    if (!palette.length) {
      return { wallColor: read.wall || "#E8E2D6", floorColor: read.floor || "#B58F62" };
    }

    // Failing that: the most dominant colour is the largest surface, which is
    // the wall; the floor is whatever contrasts with it most.
    const wall = read.wall || palette[0];
    const floor =
      read.floor ||
      [...palette].sort((a, b) => Math.abs(luminance(b) - luminance(wall)) - Math.abs(luminance(a) - luminance(wall)))[0];
    return { wallColor: wall, floorColor: floor === wall ? "#B58F62" : floor };
  }, [detected?.palette, detected?.wallColor, detected?.floorColor]);

  return (
    <div className="card h-[560px]">
      <div className="flex items-center justify-between border-b border-rule px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-ash">
        <span>3D view · drag to orbit · scroll to zoom</span>
        <span>Approximate. For visualization only.</span>
      </div>
      <div className="h-[500px] w-full">
        <Canvas shadows camera={{ position: [room.widthFt * 0.9, room.widthFt * 0.85, room.depthFt * 1.4], fov: 42 }}>
          <color attach="background" args={["#141416"]} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[8, 12, 6]} intensity={1.15} castShadow />
          <StudioEnvironment />

          <group position={[-room.widthFt / 2, 0, -room.depthFt / 2]}>
            {/* The same shell the realistic view uses, rather than the two
                hardcoded beige planes this drew before: it takes the room's
                own colours and cuts its actual windows and doors, so a green
                bedroom and a white bathroom stop looking identical. */}
            <group position={[room.widthFt / 2, 0, room.depthFt / 2]}>
              <RoomShell
                widthFt={room.widthFt}
                depthFt={room.depthFt}
                openings={detected?.openings || []}
                wallColor={wallColor}
                floorColor={floorColor}
              />
            </group>

            {/* existing furniture as translucent ghosts */}
            {(detected?.existing || []).map((e, i) => (
              <mesh key={i} position={[e.x, 0.5, e.y]}>
                <boxGeometry args={[e.widthFt, 1, e.depthFt]} />
                <meshStandardMaterial color="#B8B4AA" transparent opacity={0.25} />
              </mesh>
            ))}

            {placed.map((p) => {
              const prod = byId[p.productId];
              if (!prod) return null;
              const y = prod.height / 2;
              const selected = selectedId === p.productId;
              return (
                <group key={p.productId} position={[p.x, y, p.y]} rotation={[0, (-p.rotation * Math.PI) / 180, 0]}>
                  <mesh castShadow>
                    <boxGeometry args={[prod.width, prod.height, prod.depth]} />
                    <meshStandardMaterial color={prod.color} roughness={0.85} emissive={selected ? "#F2B441" : "#000"} emissiveIntensity={selected ? 0.35 : 0} />
                  </mesh>
                </group>
              );
            })}

            <ContactShadows position={[room.widthFt / 2, 0.01, room.depthFt / 2]} opacity={0.4} blur={2.5} far={12} />
          </group>

          <OrbitControls enablePan minDistance={4} maxDistance={80} target={[0, 1, 0]} />
        </Canvas>
      </div>
    </div>
  );
}

/** Perceived brightness, for telling a wall tone from a floor tone. */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
