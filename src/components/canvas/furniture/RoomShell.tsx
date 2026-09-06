"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Opening } from "@/lib/types";
import { WALL_HEIGHT_FT, shade } from "@/lib/furniture";
import { plasterTexture, tiled, woodFloorTexture } from "./textures";

/**
 * The room the furniture sits in: a plank floor, four walls with real
 * thickness, baseboards, and framed openings. Walls between the camera and the
 * room hide themselves each frame, so the room can be orbited without ever
 * looking through a solid surface.
 */

type Side = "N" | "S" | "E" | "W";

const THICKNESS = 0.42;
const BASEBOARD_H = 0.45;
const SILL_FT = 2.4;
const HEAD_FT = 6.7;
const DOOR_TOP_FT = 6.9;

interface Props {
  widthFt: number;
  depthFt: number;
  openings?: Opening[];
  floorColor?: string;
  wallColor?: string;
  lightsOn?: boolean;
}

interface Span {
  a0: number;
  a1: number;
  y0: number;
  y1: number;
}

/** Wall panels left over once the openings are cut out. */
function panelsAround(length: number, height: number, cuts: { a0: number; a1: number; y0: number; y1: number }[]): Span[] {
  const sorted = [...cuts].sort((p, q) => p.a0 - q.a0);
  const out: Span[] = [];
  let cursor = -length / 2;
  for (const cut of sorted) {
    const a0 = Math.max(cursor, Math.min(cut.a0, length / 2));
    const a1 = Math.max(a0, Math.min(cut.a1, length / 2));
    if (a0 > cursor) out.push({ a0: cursor, a1: a0, y0: 0, y1: height });
    if (cut.y0 > 0) out.push({ a0, a1, y0: 0, y1: cut.y0 });
    if (cut.y1 < height) out.push({ a0, a1, y0: cut.y1, y1: height });
    cursor = Math.max(cursor, a1);
  }
  if (cursor < length / 2) out.push({ a0: cursor, a1: length / 2, y0: 0, y1: height });
  return out.filter((s) => s.a1 - s.a0 > 0.01 && s.y1 - s.y0 > 0.01);
}

function Wall({
  side,
  widthFt,
  depthFt,
  height,
  color,
  openings,
  lightsOn
}: {
  side: Side;
  widthFt: number;
  depthFt: number;
  height: number;
  color: string;
  openings: Opening[];
  lightsOn: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const horizontal = side === "N" || side === "S";
  const length = horizontal ? widthFt : depthFt;
  const half = length / 2;
  const offset = horizontal ? depthFt / 2 : widthFt / 2;
  const sign = side === "N" || side === "W" ? -1 : 1;

  const map = useMemo(() => tiled(plasterTexture(color), Math.max(1, length / 8), Math.max(1, height / 8)), [color, length, height]);

  const cuts = openings.map((o) => ({
    a0: o.positionFt - half,
    a1: o.positionFt + o.widthFt - half,
    y0: o.kind === "door" ? 0 : SILL_FT,
    y1: o.kind === "door" ? DOOR_TOP_FT : HEAD_FT,
    kind: o.kind
  }));

  const spans = useMemo(() => panelsAround(length, height, cuts), [length, height, JSON.stringify(cuts)]);

  // Local axis a runs along the wall; b is the fixed distance out from center.
  const place = (a: number, y: number, b: number): [number, number, number] =>
    horizontal ? [a, y, sign * offset + b] : [sign * offset + b, y, a];
  const box = (a: number, y: number, t: number): [number, number, number] => (horizontal ? [a, y, t] : [t, y, a]);

  useFrame(({ camera }) => {
    if (!group.current) return;
    const p = camera.position;
    group.current.visible =
      side === "N" ? p.z > -depthFt / 2 : side === "S" ? p.z < depthFt / 2 : side === "W" ? p.x > -widthFt / 2 : p.x < widthFt / 2;
  });

  const inward = -sign; // toward the room center

  return (
    <group ref={group}>
      {spans.map((s, i) => (
        <mesh key={i} position={place((s.a0 + s.a1) / 2, (s.y0 + s.y1) / 2, 0)} receiveShadow castShadow>
          <boxGeometry args={box(s.a1 - s.a0, s.y1 - s.y0, THICKNESS)} />
          <meshStandardMaterial map={map || undefined} color={map ? "#ffffff" : color} roughness={0.96} />
        </mesh>
      ))}

      {/* baseboard */}
      <mesh position={place(0, BASEBOARD_H / 2, (inward * (THICKNESS + 0.09)) / 2)}>
        <boxGeometry args={box(length, BASEBOARD_H, 0.09)} />
        <meshStandardMaterial color={shade(color, 0.18)} roughness={0.7} />
      </mesh>

      {cuts.map((c, i) => {
        const mid = (c.a0 + c.a1) / 2;
        const cw = c.a1 - c.a0;
        const ch = c.y1 - c.y0;
        const face = (inward * THICKNESS) / 2;
        return (
          <group key={`o${i}`}>
            {/* casing */}
            {[
              { a: mid, y: c.y1 + 0.09, w: cw + 0.36, h: 0.18 },
              { a: c.a0 - 0.09, y: (c.y0 + c.y1) / 2, w: 0.18, h: ch },
              { a: c.a1 + 0.09, y: (c.y0 + c.y1) / 2, w: 0.18, h: ch }
            ].map((f, k) => (
              <mesh key={k} position={place(f.a, f.y, face * 1.1)}>
                <boxGeometry args={box(f.w, f.h, 0.1)} />
                <meshStandardMaterial color={shade(color, 0.2)} roughness={0.65} />
              </mesh>
            ))}
            {c.kind === "window" ? (
              <>
                {/* sill */}
                <mesh position={place(mid, c.y0 - 0.06, face * 1.4)} castShadow>
                  <boxGeometry args={box(cw + 0.4, 0.12, 0.5)} />
                  <meshStandardMaterial color={shade(color, 0.22)} roughness={0.6} />
                </mesh>
                {/* daylight pane */}
                <mesh position={place(mid, (c.y0 + c.y1) / 2, 0)} rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
                  <planeGeometry args={[cw, ch]} />
                  <meshBasicMaterial color={lightsOn ? "#33405C" : "#F4F1E6"} toneMapped={false} side={THREE.DoubleSide} />
                </mesh>
                {/* muntin */}
                <mesh position={place(mid, (c.y0 + c.y1) / 2, face * 0.8)}>
                  <boxGeometry args={box(0.06, ch, 0.06)} />
                  <meshStandardMaterial color={shade(color, 0.2)} roughness={0.6} />
                </mesh>
                {!lightsOn && (
                  <pointLight position={place(mid, (c.y0 + c.y1) / 2, inward * 0.8)} intensity={9} distance={26} decay={2} color="#FFF6E4" />
                )}
              </>
            ) : (
              <mesh position={place(mid, (c.y0 + c.y1) / 2, 0)} rotation={horizontal ? [0, 0, 0] : [0, Math.PI / 2, 0]}>
                <planeGeometry args={[cw, ch]} />
                <meshBasicMaterial color="#191A1E" side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

/**
 * The ceiling, which hides itself the moment the camera rises above it -- the
 * same rule the walls follow, so the room can still be orbited from overhead.
 *
 * It exists because the view is now a wide shot from standing height, and
 * without a ceiling that shot sees straight over the wall tops into the
 * background. That void used to be a cosmetic gap; it is now part of the frame
 * handed to the image model, which is asked to reproduce what it is given.
 *
 * It never casts a shadow, so the daylight rig above the room still reaches the
 * floor and nothing goes dark.
 */
function Ceiling({ widthFt, depthFt, height, color }: { widthFt: number; depthFt: number; height: number; color: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(({ camera }) => {
    if (mesh.current) mesh.current.visible = camera.position.y < height;
  });
  return (
    <mesh ref={mesh} position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[widthFt, depthFt]} />
      <meshStandardMaterial color={shade(color, 0.14)} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function RoomShell({ widthFt, depthFt, openings = [], floorColor = "#B58F62", wallColor = "#E8E2D6", lightsOn = false }: Props) {
  const height = WALL_HEIGHT_FT;
  const floorMap = useMemo(() => tiled(woodFloorTexture(floorColor), Math.max(1, widthFt / 6), Math.max(1, depthFt / 6)), [floorColor, widthFt, depthFt]);

  const bySide = (s: Side) => openings.filter((o) => o.wall === s);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[widthFt, depthFt]} />
        <meshStandardMaterial map={floorMap || undefined} color={floorMap ? "#ffffff" : floorColor} roughness={0.55} metalness={0.02} />
      </mesh>

      <Ceiling widthFt={widthFt} depthFt={depthFt} height={height} color={wallColor} />

      {(["N", "S", "E", "W"] as Side[]).map((side) => (
        <Wall
          key={side}
          side={side}
          widthFt={widthFt}
          depthFt={depthFt}
          height={height}
          color={wallColor}
          openings={bySide(side)}
          lightsOn={lightsOn}
        />
      ))}
    </group>
  );
}
