"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, SoftShadows } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { woodFloor, rugWeave } from "@/lib/render/textures";
import type { DetectedRoom, Opening, PlacedItem, Product, RoomSpec } from "@/lib/types";

interface Props {
  room: RoomSpec;
  detected?: DetectedRoom | null;
  products: Product[];
  placed: PlacedItem[];
  selectedId: string | null;
}

const CEIL = 8.5;
const WALL_T = 0.35;
const WALL = "#F4F1EA";
const WALL_SIDE = "#E4DFD4";
const TRIM = "#FFFFFF";

export function RoomScene({ room, detected, products, placed, selectedId }: Props) {
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const W = room.widthFt;
  const D = room.depthFt;
  const floorTex = useMemo(() => woodFloor(Math.max(3, W / 3), Math.max(3, D / 3)), [W, D]);

  /**
   * Frame the whole box regardless of room size. The diagonal drives the
   * distance so a 20 ft studio and an 8 ft nook both fill the viewport, and
   * the 42-degree elevation is what gives the dollhouse read.
   */
  const cam = useMemo<[number, number, number]>(() => {
    const diag = Math.hypot(W, D, CEIL);
    const dist = diag * 1.75 + 4;
    const el = (38 * Math.PI) / 180;   // elevation: the dollhouse read
    const az = (42 * Math.PI) / 180;   // azimuth: square onto the open corner
    const ground = dist * Math.cos(el);
    return [ground * Math.sin(az), dist * Math.sin(el), ground * Math.cos(az)];
  }, [W, D]);

  // Cutaway: keep the two far walls (N and W), drop the near ones so the room
  // reads like an open dollhouse box.
  const openings = detected?.openings || [];

  return (
    <div className="card h-[560px]">
      <div className="flex items-center justify-between border-b border-rule/30 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-ash">
        <span>3D view · drag to orbit · scroll to zoom</span>
        <span>Approximate. For visualization only.</span>
      </div>
      <div className="h-[500px] w-full">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: cam, fov: 30, near: 0.1, far: 400 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
        >
          <color attach="background" args={["#D8D2C8"]} />
          <SoftShadows size={28} samples={12} focus={0.6} />

          <hemisphereLight args={["#FFFFFF", "#C9C0B2", 1.15]} />
          <directionalLight
            position={[W * 0.8, 16, D * 1.1]}
            intensity={2.1}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-Math.max(W, D)}
            shadow-camera-right={Math.max(W, D)}
            shadow-camera-top={Math.max(W, D)}
            shadow-camera-bottom={-Math.max(W, D)}
          />
          {/* Fill from the open side so the cutaway interior never goes muddy.
              Deliberately no <Environment> — its HDR comes from a third-party
              CDN and a failed fetch throws inside the render tree. */}
          <directionalLight position={[-W, 10, -D]} intensity={0.55} />
          <directionalLight position={[W / 2, 6, D * 2]} intensity={0.7} />
          <ambientLight intensity={0.35} />

          {/* Centre the room on the origin so orbit feels natural */}
          <group position={[-W / 2, 0, -D / 2]}>
            {/* slab under the floor, gives the box thickness */}
            <mesh receiveShadow position={[W / 2, -0.16, D / 2]}>
              <boxGeometry args={[W + WALL_T * 2, 0.32, D + WALL_T * 2]} />
              <meshStandardMaterial color={TRIM} roughness={0.9} />
            </mesh>

            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0.001, D / 2]}>
              <planeGeometry args={[W, D]} />
              <meshStandardMaterial map={floorTex} roughness={0.72} />
            </mesh>

            {/* far wall (N) and left wall (W), each with their openings cut out */}
            <Wall orientation="N" room={room} openings={openings} />
            <Wall orientation="W" room={room} openings={openings} />

            {/* existing furniture as translucent ghosts */}
            {(detected?.existing || []).map((e, i) => (
              <mesh key={i} position={[e.x, 0.75, e.y]}>
                <boxGeometry args={[e.widthFt, 1.5, e.depthFt]} />
                <meshStandardMaterial color="#9C978C" transparent opacity={0.22} />
              </mesh>
            ))}

            {placed.map((p) => {
              const prod = byId[p.productId];
              if (!prod) return null;
              return (
                <group key={p.productId} position={[p.x, 0, p.y]} rotation={[0, (-p.rotation * Math.PI) / 180, 0]}>
                  <Piece product={prod} selected={selectedId === p.productId} />
                </group>
              );
            })}

            <ContactShadows position={[W / 2, 0.02, D / 2]} scale={Math.max(W, D) * 1.6} opacity={0.42} blur={2} far={8} />
          </group>

          <OrbitControls
            enablePan
            enableDamping
            dampingFactor={0.08}
            minDistance={Math.hypot(W, D) * 0.55}
            maxDistance={Math.hypot(W, D) * 3.5}
            maxPolarAngle={Math.PI / 2.15}
            target={[0, 1.4, 0]}
          />
        </Canvas>
      </div>
    </div>
  );
}

/**
 * One wall, built as segments around its door and window openings so the
 * holes are real geometry rather than painted-on rectangles.
 */
function Wall({ orientation, room, openings }: { orientation: "N" | "W"; room: RoomSpec; openings: Opening[] }) {
  const W = room.widthFt;
  const D = room.depthFt;
  const span = orientation === "N" ? W : D;

  const mine = openings
    .filter((o) => o.wall === orientation)
    .map((o) => ({
      start: Math.max(0, Math.min(span - 0.5, o.positionFt)),
      width: Math.min(o.widthFt, span),
      kind: o.kind,
      sillFt: o.kind === "door" ? 0 : 2.6,
      headFt: o.kind === "door" ? 6.8 : 6.2
    }))
    .sort((a, b) => a.start - b.start);

  // Horizontal runs of solid wall between openings
  const segments: { at: number; len: number }[] = [];
  let cursor = 0;
  for (const o of mine) {
    if (o.start > cursor) segments.push({ at: cursor, len: o.start - cursor });
    cursor = Math.max(cursor, o.start + o.width);
  }
  if (cursor < span) segments.push({ at: cursor, len: span - cursor });

  /** Place a slab: u runs along the wall, v is height, thickness is fixed. */
  const slab = (uStart: number, uLen: number, vStart: number, vLen: number, key: string, color = WALL) => {
    if (uLen <= 0.001 || vLen <= 0.001) return null;
    const u = uStart + uLen / 2;
    const v = vStart + vLen / 2;
    const pos: [number, number, number] =
      orientation === "N" ? [u, v, -WALL_T / 2] : [-WALL_T / 2, v, u];
    const args: [number, number, number] =
      orientation === "N" ? [uLen, vLen, WALL_T] : [WALL_T, vLen, uLen];
    return (
      <mesh key={key} position={pos} castShadow receiveShadow>
        <boxGeometry args={args} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    );
  };

  return (
    <group>
      {segments.map((s, i) => slab(s.at, s.len, 0, CEIL, `seg-${i}`))}

      {mine.map((o, i) => (
        <group key={`op-${i}`}>
          {/* under a window */}
          {o.sillFt > 0 && slab(o.start, o.width, 0, o.sillFt, `sill-${i}`)}
          {/* over the opening */}
          {slab(o.start, o.width, o.headFt, CEIL - o.headFt, `head-${i}`)}
          {/* reveal frame */}
          {slab(o.start - 0.12, 0.12, o.sillFt, o.headFt - o.sillFt, `jl-${i}`, TRIM)}
          {slab(o.start + o.width, 0.12, o.sillFt, o.headFt - o.sillFt, `jr-${i}`, TRIM)}
          {o.kind === "window" && (
            <Glass orientation={orientation} start={o.start} width={o.width} sill={o.sillFt} head={o.headFt} />
          )}
        </group>
      ))}

      {/* baseboard */}
      {segments.map((s, i) => {
        const u = s.at + s.len / 2;
        const pos: [number, number, number] =
          orientation === "N" ? [u, 0.28, WALL_T * 0.15] : [WALL_T * 0.15, 0.28, u];
        const args: [number, number, number] =
          orientation === "N" ? [s.len, 0.56, 0.14] : [0.14, 0.56, s.len];
        return (
          <mesh key={`base-${i}`} position={pos}>
            <boxGeometry args={args} />
            <meshStandardMaterial color={TRIM} roughness={0.6} />
          </mesh>
        );
      })}

      {/* outer face reads slightly darker, which sells the cutaway */}
      <mesh position={orientation === "N" ? [W / 2, CEIL / 2, -WALL_T - 0.01] : [-WALL_T - 0.01, CEIL / 2, D / 2]}>
        <boxGeometry args={orientation === "N" ? [W + WALL_T * 2, CEIL, 0.02] : [0.02, CEIL, D + WALL_T * 2]} />
        <meshStandardMaterial color={WALL_SIDE} roughness={1} />
      </mesh>
    </group>
  );
}

function Glass({ orientation, start, width, sill, head }: { orientation: "N" | "W"; start: number; width: number; sill: number; head: number }) {
  const u = start + width / 2;
  const v = sill + (head - sill) / 2;
  const pos: [number, number, number] = orientation === "N" ? [u, v, -WALL_T / 2] : [-WALL_T / 2, v, u];
  const args: [number, number, number] =
    orientation === "N" ? [width, head - sill, 0.04] : [0.04, head - sill, width];
  return (
    <mesh position={pos}>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#DCEAF2" roughness={0.05} metalness={0.2} transparent opacity={0.5} emissive="#EAF4FA" emissiveIntensity={0.45} />
    </mesh>
  );
}

/**
 * Rough massing per category — enough silhouette that a sofa reads as a sofa.
 * The Render tab is the photorealistic one; this is the fast, editable view.
 */
function Piece({ product, selected }: { product: Product; selected: boolean }) {
  const { width: w, depth: d, height: h, color, category } = product;
  const glow = selected ? { emissive: "#C89F5A", emissiveIntensity: 0.34 } : {};
  const M = ({ c = color, rough = 0.82 }: { c?: string; rough?: number } = {}) => (
    <meshStandardMaterial color={c} roughness={rough} {...glow} />
  );
  const LEG = "#5A4632";

  switch (category) {
    case "sofa": {
      const seat = h * 0.42;
      const arm = Math.min(0.55, w * 0.12);
      return (
        <group>
          <mesh castShadow receiveShadow position={[0, seat * 0.55, 0]}>
            <boxGeometry args={[w - arm * 2, seat * 0.7, d]} /><M />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} castShadow position={[(s * (w - arm)) / 2, seat * 0.85, 0]}>
              <boxGeometry args={[arm, seat * 1.3, d]} /><M />
            </mesh>
          ))}
          <mesh castShadow position={[0, h * 0.62, -d / 2 + 0.24]}>
            <boxGeometry args={[w - arm * 2, h * 0.72, 0.45]} /><M />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={`c${s}`} castShadow position={[(s * (w - arm * 2)) / 4, seat * 0.98, 0.1]}>
              <boxGeometry args={[(w - arm * 2) / 2 - 0.1, 0.3, d - 0.5]} /><M rough={0.95} />
            </mesh>
          ))}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} castShadow position={[(sx * (w - 0.5)) / 2, 0.16, (sz * (d - 0.5)) / 2]}>
              <cylinderGeometry args={[0.07, 0.05, 0.32, 8]} /><meshStandardMaterial color={LEG} />
            </mesh>
          ))}
        </group>
      );
    }
    case "bed": {
      const base = h * 0.5;
      return (
        <group>
          <mesh castShadow receiveShadow position={[0, base * 0.5, 0]}>
            <boxGeometry args={[w, base, d]} /><M c={LEG} rough={0.7} />
          </mesh>
          <mesh castShadow position={[0, base + 0.42, 0.15]}>
            <boxGeometry args={[w - 0.25, 0.84, d - 0.6]} /><M c="#F5F2EA" rough={0.95} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} castShadow position={[(s * (w - 2.0)) / 2, base + 0.98, -d / 2 + 1.1]}>
              <boxGeometry args={[1.7, 0.34, 1.05]} /><M c="#FFFFFF" rough={1} />
            </mesh>
          ))}
          <mesh castShadow position={[0, base + 1.3, -d / 2 + 0.12]}>
            <boxGeometry args={[w, Math.max(1.8, h - base), 0.24]} /><M c={LEG} rough={0.65} />
          </mesh>
        </group>
      );
    }
    case "chair": {
      const seat = h * 0.45;
      return (
        <group>
          <mesh castShadow position={[0, seat, 0]}>
            <boxGeometry args={[w, 0.34, d]} /><M />
          </mesh>
          <mesh castShadow position={[0, seat + h * 0.3, -d / 2 + 0.14]}>
            <boxGeometry args={[w, h * 0.58, 0.24]} /><M />
          </mesh>
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} castShadow position={[(sx * (w - 0.25)) / 2, seat / 2, (sz * (d - 0.25)) / 2]}>
              <cylinderGeometry args={[0.06, 0.05, seat, 8]} /><meshStandardMaterial color={LEG} />
            </mesh>
          ))}
        </group>
      );
    }
    case "table":
    case "desk":
    case "nightstand": {
      const legH = h - 0.18;
      return (
        <group>
          <mesh castShadow receiveShadow position={[0, h - 0.09, 0]}>
            <boxGeometry args={[w, 0.18, d]} /><M rough={0.55} />
          </mesh>
          {category === "nightstand" && (
            <mesh castShadow position={[0, h * 0.45, 0]}>
              <boxGeometry args={[w - 0.12, h * 0.6, d - 0.12]} /><M rough={0.7} />
            </mesh>
          )}
          {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz], i) => (
            <mesh key={i} castShadow position={[(sx * (w - 0.3)) / 2, legH / 2, (sz * (d - 0.3)) / 2]}>
              <boxGeometry args={[0.13, legH, 0.13]} /><meshStandardMaterial color={LEG} />
            </mesh>
          ))}
        </group>
      );
    }
    case "shelf":
    case "dresser": {
      const n = Math.max(2, Math.round(h / 1.3));
      return (
        <group>
          <mesh castShadow position={[0, h / 2, -d / 2 + 0.04]}>
            <boxGeometry args={[w, h, 0.08]} /><M rough={0.9} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} castShadow position={[(s * (w - 0.12)) / 2, h / 2, 0]}>
              <boxGeometry args={[0.12, h, d]} /><M />
            </mesh>
          ))}
          {Array.from({ length: n }, (_, i) => (
            <mesh key={i} castShadow position={[0, (h / (n - 1)) * i, 0]}>
              <boxGeometry args={[w, 0.1, d]} /><M />
            </mesh>
          ))}
        </group>
      );
    }
    case "lamp":
      return (
        <group>
          <mesh castShadow position={[0, 0.05, 0]}>
            <cylinderGeometry args={[w * 0.46, w * 0.52, 0.1, 24]} /><meshStandardMaterial color={LEG} metalness={0.5} roughness={0.4} />
          </mesh>
          <mesh castShadow position={[0, h * 0.48, 0]}>
            <cylinderGeometry args={[0.05, 0.05, h * 0.92, 12]} /><meshStandardMaterial color={color} metalness={0.7} roughness={0.3} />
          </mesh>
          <mesh position={[0, h - 0.42, 0]}>
            <cylinderGeometry args={[w * 0.52, w * 0.66, 0.85, 24, 1, true]} />
            <meshStandardMaterial color="#FBF6EA" side={THREE.DoubleSide} emissive="#FFE2AE" emissiveIntensity={0.75} roughness={1} />
          </mesh>
          <pointLight position={[0, h - 0.6, 0]} intensity={2.2} distance={9} color="#FFE0B0" />
        </group>
      );
    case "plant":
      return (
        <group>
          <mesh castShadow position={[0, 0.42, 0]}>
            <cylinderGeometry args={[w * 0.32, w * 0.24, 0.85, 20]} /><meshStandardMaterial color="#C4B49A" roughness={0.95} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            const r = Math.min(w, 2.4) * 0.3;
            return (
              <mesh key={i} castShadow position={[Math.cos(a) * r, h * (0.55 + (i % 2) * 0.16), Math.sin(a) * r]}>
                <sphereGeometry args={[Math.min(w, 2.4) * 0.34, 12, 10]} />
                <meshStandardMaterial color={i % 2 ? "#4E6837" : "#3F5A2A"} roughness={1} {...glow} />
              </mesh>
            );
          })}
        </group>
      );
    case "rug":
      return (
        <mesh receiveShadow position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial map={rugWeave(color)} color={color} roughness={1} {...glow} />
        </mesh>
      );
    case "art":
    case "mirror":
      return (
        <group position={[0, Math.max(h / 2 + 2.4, 4.2), 0]}>
          <mesh castShadow>
            <boxGeometry args={[w + 0.12, h + 0.12, 0.1]} /><meshStandardMaterial color={LEG} roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.06]}>
            <boxGeometry args={[w, h, 0.03]} />
            <meshStandardMaterial
              color={color}
              roughness={category === "mirror" ? 0.05 : 0.85}
              metalness={category === "mirror" ? 0.95 : 0}
              {...glow}
            />
          </mesh>
        </group>
      );
    default:
      return (
        <mesh castShadow position={[0, h / 2, 0]}>
          <boxGeometry args={[w, h, d]} /><M />
        </mesh>
      );
  }
}
