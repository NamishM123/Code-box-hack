"use client";
import { createContext, useContext, useMemo } from "react";
import * as THREE from "three";
import { RoundedBox } from "@react-three/drei";
import type { Product } from "@/lib/types";
import { BRASS, finishFor, hints, legTone, luminance, mix, safeRadius, seatCount, seeded, shade } from "@/lib/furniture";
import { artTexture, rugTexture, tiled, weaveBumpTexture } from "./textures";

/**
 * Furniture built parametrically from each listing's real width, depth and
 * height. Nothing is scaled from a generic block: leg thickness, cushion depth
 * and shelf spacing stay at true size, so a 5'4" loveseat and a 7'2" sectional
 * read as different pieces of furniture rather than two sizes of the same box.
 */

export const SceneMode = createContext({ lightsOn: false });

interface PieceProps {
  product: Product;
}

const SEG = 20;

function useWeave() {
  return useMemo(() => tiled(weaveBumpTexture(), 3, 3), []);
}

/* ------------------------------------------------------------------ parts */

function Legs({
  w,
  d,
  top,
  color,
  radius = 0.055,
  inset = 0.3,
  taper = 0.62,
  square = false
}: {
  w: number;
  d: number;
  top: number;
  color: string;
  radius?: number;
  inset?: number;
  taper?: number;
  square?: boolean;
}) {
  const x = Math.max(0.12, w / 2 - inset);
  const z = Math.max(0.12, d / 2 - inset);
  const spots: [number, number][] = [
    [x, z],
    [-x, z],
    [x, -z],
    [-x, -z]
  ];
  return (
    <group>
      {spots.map(([px, pz], i) => (
        <mesh key={i} position={[px, top / 2, pz]} castShadow>
          {square ? (
            <boxGeometry args={[radius * 2, top, radius * 2]} />
          ) : (
            <cylinderGeometry args={[radius, radius * taper, top, 12]} />
          )}
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------ upholstered */

/** Sofas, loveseats and lounge chairs share one frame: arms, deck, cushions. */
function Upholstered({ product, seats }: PieceProps & { seats?: number }) {
  const { width: w, depth: d, height: h } = product;
  const hint = hints(product);
  const weave = useWeave();
  const finish = finishFor(product);
  const body = product.color;
  const light = luminance(body) > 0.55;
  const cushionColor = shade(body, light ? -0.05 : 0.08);
  const wood = legTone(product);

  const n = seats ?? seatCount(w);
  const legH = hint.modular ? 0.14 : Math.min(0.34, h * 0.13);
  const armW = Math.min(0.66, Math.max(0.3, w * 0.13));
  const backD = Math.min(0.52, d * 0.22);
  const seatTop = Math.max(legH + 0.72, h * 0.5);
  const cushH = Math.min(hint.modular ? 0.56 : 0.44, (seatTop - legH) * 0.6);
  const deckTop = seatTop - cushH;
  const armTop = Math.max(seatTop + 0.28, h * 0.66);
  const innerW = w - armW * 2;
  const seatD = d - backD;
  const soft = { roughness: finish.roughness, metalness: finish.metalness };

  const cushions = Array.from({ length: n }, (_, i) => -innerW / 2 + (innerW / n) * (i + 0.5));

  return (
    <group>
      <Legs w={w} d={d} top={legH} color={wood} inset={0.34} radius={0.06} />

      {/* deck */}
      <RoundedBox
        args={[w, deckTop - legH, d]}
        radius={safeRadius(0.07, w, deckTop - legH, d)}
        smoothness={2}
        position={[0, (legH + deckTop) / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={shade(body, -0.1)} bumpMap={weave || undefined} bumpScale={0.02} {...soft} />
      </RoundedBox>

      {/* back */}
      <RoundedBox
        args={[w, h - deckTop, backD]}
        radius={safeRadius(0.1, w, h - deckTop, backD)}
        smoothness={2}
        position={[0, (deckTop + h) / 2, -d / 2 + backD / 2]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={body} bumpMap={weave || undefined} bumpScale={0.02} {...soft} />
      </RoundedBox>

      {/* arms, rolled */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[armW, armTop - legH, d]}
          radius={safeRadius(armW * 0.45, armW, armTop - legH, d)}
          smoothness={3}
          position={[s * (w - armW) / 2, (legH + armTop) / 2, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={body} bumpMap={weave || undefined} bumpScale={0.02} {...soft} />
        </RoundedBox>
      ))}

      {/* seat cushions */}
      {cushions.map((cx, i) => (
        <RoundedBox
          key={`s${i}`}
          args={[innerW / n - 0.07, cushH, seatD - 0.12]}
          radius={safeRadius(0.09, innerW / n - 0.07, cushH, seatD - 0.12)}
          smoothness={3}
          position={[cx, deckTop + cushH / 2, backD / 2]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={cushionColor} bumpMap={weave || undefined} bumpScale={0.024} {...soft} />
        </RoundedBox>
      ))}

      {/* back cushions, leaned into the frame */}
      {cushions.map((cx, i) => {
        const bh = (h - seatTop) * 0.95;
        const bd = Math.min(0.42, backD * 0.9);
        if (bh < 0.2) return null;
        return (
          <RoundedBox
            key={`b${i}`}
            args={[innerW / n - 0.09, bh, bd]}
            radius={safeRadius(0.1, innerW / n - 0.09, bh, bd)}
            smoothness={3}
            position={[cx, seatTop + bh / 2 - 0.04, -d / 2 + backD + bd / 2 - 0.1]}
            rotation={[-0.1, 0, 0]}
            castShadow
          >
            <meshStandardMaterial color={cushionColor} bumpMap={weave || undefined} bumpScale={0.024} {...soft} />
          </RoundedBox>
        );
      })}
    </group>
  );
}

/** Dining and desk chairs: thin legs, a shaped back, no upholstered mass. */
function DiningChair({ product }: PieceProps) {
  const { width: w, depth: d, height: h } = product;
  const wood = product.color;
  const seatH = Math.min(1.55, h * 0.52);
  const legR = 0.048;
  const backH = h - seatH;

  return (
    <group>
      <Legs w={w} d={d} top={seatH} color={shade(wood, -0.12)} inset={0.16} radius={legR} taper={0.8} />
      <mesh position={[0, seatH - 0.05, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[w * 0.94, 0.11, d * 0.9]} />
        <meshStandardMaterial color={wood} roughness={0.6} />
      </mesh>
      {/* stretchers */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - 0.16), seatH * 0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[legR * 0.7, legR * 0.7, d * 0.72, 8]} />
          <meshStandardMaterial color={shade(wood, -0.12)} roughness={0.6} />
        </mesh>
      ))}
      {/* back: two posts, a crest rail, slats */}
      <group position={[0, seatH, -d / 2 + 0.14]} rotation={[-0.09, 0, 0]}>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (w / 2 - 0.13), backH / 2, 0]} castShadow>
            <cylinderGeometry args={[legR * 0.95, legR, backH, 10]} />
            <meshStandardMaterial color={shade(wood, -0.06)} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, backH - 0.09, 0]} castShadow>
          <boxGeometry args={[w * 0.9, 0.17, 0.13]} />
          <meshStandardMaterial color={shade(wood, -0.04)} roughness={0.6} />
        </mesh>
        {[-0.22, 0.22].map((s, i) => (
          <mesh key={i} position={[s * w, backH * 0.52, 0]} castShadow>
            <boxGeometry args={[0.08, backH * 0.82, 0.07]} />
            <meshStandardMaterial color={shade(wood, -0.02)} roughness={0.62} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Chair({ product }: PieceProps) {
  const hint = hints(product);
  const lounge = !hint.dining && product.width >= 2.2 && product.height < 3.2;
  return lounge ? <Upholstered product={product} seats={1} /> : <DiningChair product={product} />;
}

/* ----------------------------------------------------------------- tables */

function Table({ product }: PieceProps) {
  const { width: w, depth: d, height: h } = product;
  const hint = hints(product);
  const finish = finishFor(product);
  const round = hint.round || Math.abs(w - d) < 0.35;
  const top = product.color;
  const wood = legTone(product);
  const mat = { roughness: finish.roughness, metalness: finish.metalness };
  const topH = 0.14;

  if (hint.plinth) {
    return (
      <group>
        <RoundedBox args={[w, topH, d]} radius={safeRadius(0.05, w, topH, d)} smoothness={2} position={[0, h - topH / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial color={top} {...mat} />
        </RoundedBox>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (w / 2 - w * 0.09), (h - topH) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.16, h - topH, d * 0.92]} />
            <meshStandardMaterial color={shade(top, -0.07)} {...mat} />
          </mesh>
        ))}
      </group>
    );
  }

  if (finish.kind === "stone" || (round && w < 1.9)) {
    // pedestal: base disc, column, top
    return (
      <group>
        <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w * 0.4, w * 0.42, 0.14, SEG]} />
          <meshStandardMaterial color={shade(top, -0.08)} {...mat} />
        </mesh>
        <mesh position={[0, h / 2, 0]} castShadow>
          <cylinderGeometry args={[w * 0.2, w * 0.24, h - 0.2, SEG]} />
          <meshStandardMaterial color={top} {...mat} />
        </mesh>
        <mesh position={[0, h - topH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w / 2, w / 2, topH, SEG]} />
          <meshStandardMaterial color={top} {...mat} />
        </mesh>
      </group>
    );
  }

  if (round) {
    return (
      <group>
        <mesh position={[0, h - topH / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w / 2, w / 2, topH, SEG * 2]} />
          <meshStandardMaterial color={top} {...mat} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const r = w * 0.34;
          return (
            <mesh key={i} position={[Math.cos(a) * r, (h - topH) / 2, Math.sin(a) * r]} rotation={[Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]} castShadow>
              <cylinderGeometry args={[0.058, 0.045, h - topH, 10]} />
              <meshStandardMaterial color={wood} roughness={0.55} />
            </mesh>
          );
        })}
      </group>
    );
  }

  return (
    <group>
      <RoundedBox args={[w, topH, d]} radius={safeRadius(0.04, w, topH, d)} smoothness={2} position={[0, h - topH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={top} {...mat} />
      </RoundedBox>
      <mesh position={[0, h - topH - 0.12, 0]}>
        <boxGeometry args={[w - 0.5, 0.16, d - 0.5]} />
        <meshStandardMaterial color={shade(top, -0.12)} {...mat} />
      </mesh>
      <Legs w={w} d={d} top={h - topH} color={wood} inset={0.26} radius={0.06} square taper={1} />
    </group>
  );
}

/* -------------------------------------------------------------- desk, bed */

function Desk({ product }: PieceProps) {
  const { width: w, depth: d, height: h } = product;
  const top = product.color;
  const wood = legTone(product);
  const topH = 0.13;
  return (
    <group>
      <RoundedBox args={[w, topH, d]} radius={safeRadius(0.04, w, topH, d)} smoothness={2} position={[0, h - topH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={top} roughness={0.55} />
      </RoundedBox>
      {/* drawer under the top, right side */}
      <group position={[w * 0.24, h - topH - 0.24, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[w * 0.42, 0.42, d * 0.82]} />
          <meshStandardMaterial color={shade(top, -0.08)} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0, d * 0.42]}>
          <cylinderGeometry args={[0.035, 0.035, w * 0.16, 10]} />
          <meshStandardMaterial color={BRASS} roughness={0.32} metalness={0.85} />
        </mesh>
      </group>
      {/* modesty panel */}
      <mesh position={[0, h - 0.62, -d / 2 + 0.16]}>
        <boxGeometry args={[w - 0.6, 0.66, 0.06]} />
        <meshStandardMaterial color={shade(top, -0.14)} roughness={0.65} />
      </mesh>
      <Legs w={w} d={d} top={h - topH} color={wood} inset={0.24} radius={0.055} square taper={1} />
    </group>
  );
}

function Bed({ product }: PieceProps) {
  const { width: w, depth: d, height: h } = product;
  const finish = finishFor(product);
  const frame = product.color;
  const upholstered = finish.kind === "fabric" || finish.kind === "leather";
  const weave = useWeave();
  const linen = shade(mix(frame, "#F5F1E8", 0.75), 0.02);
  const throwColor = shade(mix(frame, "#B9A98C", 0.5), -0.05);
  const baseH = 0.62;
  const mattH = 0.72;
  const baseLift = 0.12;
  const mattTop = baseLift + baseH + mattH;
  const headH = Math.max(h, baseH + 0.9);

  return (
    <group>
      {/* platform */}
      <RoundedBox args={[w, baseH, d]} radius={safeRadius(0.05, w, baseH, d)} smoothness={2} position={[0, baseH / 2 + 0.12, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={frame} roughness={upholstered ? 0.92 : 0.6} bumpMap={upholstered ? weave || undefined : undefined} bumpScale={0.02} />
      </RoundedBox>
      <Legs w={w - 0.5} d={d - 0.5} top={0.14} color={legTone(product)} inset={0.12} radius={0.07} square taper={1} />

      {/* mattress */}
      <RoundedBox args={[w - 0.18, mattH, d - 0.5]} radius={safeRadius(0.12, w - 0.18, mattH, d - 0.5)} smoothness={3} position={[0, mattTop - mattH / 2, 0.1]} castShadow receiveShadow>
        <meshStandardMaterial color={linen} roughness={0.95} bumpMap={weave || undefined} bumpScale={0.02} />
      </RoundedBox>

      {/* duvet folded over the lower two thirds */}
      <RoundedBox
        args={[w - 0.04, 0.32, d * 0.6]}
        radius={safeRadius(0.13, w - 0.04, 0.32, d * 0.6)}
        smoothness={3}
        position={[0, mattTop + 0.07, d * 0.19]}
        castShadow
      >
        <meshStandardMaterial color={throwColor} roughness={0.95} bumpMap={weave || undefined} bumpScale={0.03} />
      </RoundedBox>

      {/* pillows */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={s}
          args={[w * 0.4, 0.28, 0.95]}
          radius={safeRadius(0.13, w * 0.4, 0.28, 0.95)}
          smoothness={3}
          position={[s * w * 0.22, mattTop + 0.13, -d / 2 + 1.15]}
          rotation={[-0.16, 0, 0]}
          castShadow
        >
          <meshStandardMaterial color={shade(linen, 0.03)} roughness={0.96} bumpMap={weave || undefined} bumpScale={0.02} />
        </RoundedBox>
      ))}

      {/* headboard */}
      <RoundedBox
        args={[w, headH, upholstered ? 0.34 : 0.2]}
        radius={safeRadius(upholstered ? 0.14 : 0.05, w, headH, 0.2)}
        smoothness={3}
        position={[0, headH / 2, -d / 2 + 0.14]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={frame} roughness={upholstered ? 0.93 : 0.6} bumpMap={upholstered ? weave || undefined : undefined} bumpScale={0.024} />
      </RoundedBox>
    </group>
  );
}

/* ------------------------------------------------------------------- soft */

function Rug({ product }: PieceProps) {
  const { width: w, depth: d } = product;
  const map = useMemo(() => rugTexture(product.color), [product.color]);
  return (
    <group>
      <mesh position={[0, 0.025, 0]} receiveShadow>
        <boxGeometry args={[w, 0.05, d]} />
        <meshStandardMaterial color={shade(product.color, -0.14)} roughness={1} />
      </mesh>
      <mesh position={[0, 0.052, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={map || undefined} color={map ? "#ffffff" : product.color} roughness={1} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ lamps */

function Lamp({ product }: PieceProps) {
  const { width: w, height: h } = product;
  const hint = hints(product);
  const { lightsOn } = useContext(SceneMode);
  const metal = legTone(product);
  const shadeColor = hint.lantern ? "#F5F0E2" : shade(product.color, 0.24);
  const glow = lightsOn ? 1.15 : 0.06;

  const arcCurve = useMemo(() => {
    const reach = Math.max(1.6, h * 0.46);
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.1, 0),
      new THREE.Vector3(0, h * 0.62, 0.06),
      new THREE.Vector3(0, h * 0.97, reach * 0.42),
      new THREE.Vector3(0, h, reach)
    ]);
  }, [h]);

  if (hint.arc) {
    const reach = Math.max(1.6, h * 0.46);
    const shadeH = 0.62;
    return (
      <group>
        <mesh position={[0, 0.06, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w * 0.46, w * 0.5, 0.12, SEG]} />
          <meshStandardMaterial color={metal} roughness={0.35} metalness={0.8} />
        </mesh>
        <mesh castShadow>
          <tubeGeometry args={[arcCurve, 42, 0.045, 10, false]} />
          <meshStandardMaterial color={metal} roughness={0.3} metalness={0.85} />
        </mesh>
        <group position={[0, h - shadeH / 2, reach]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.42, 0.56, shadeH, SEG, 1, true]} />
            <meshStandardMaterial color={shadeColor} roughness={0.45} metalness={0.6} side={THREE.DoubleSide} emissive={shadeColor} emissiveIntensity={glow * 0.25} />
          </mesh>
          <mesh position={[0, -shadeH / 2 + 0.05, 0]}>
            <sphereGeometry args={[0.16, 12, 12]} />
            <meshStandardMaterial color="#FFF3D8" emissive="#FFD9A0" emissiveIntensity={glow * 2.4} />
          </mesh>
          {lightsOn && <pointLight position={[0, -0.3, 0]} intensity={2.6} distance={12} decay={2} color="#FFD9A0" castShadow />}
        </group>
      </group>
    );
  }

  if (hint.lantern) {
    const r = Math.max(0.45, w * 0.52);
    return (
      <group>
        <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[w * 0.34, w * 0.38, 0.1, SEG]} />
          <meshStandardMaterial color={metal} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, (h - r) / 2, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.035, h - r, 8]} />
          <meshStandardMaterial color={metal} roughness={0.4} metalness={0.6} />
        </mesh>
        <mesh position={[0, h - r, 0]} castShadow>
          <sphereGeometry args={[r, 22, 18]} />
          <meshStandardMaterial color={shadeColor} roughness={0.9} emissive="#FFE7BE" emissiveIntensity={glow * 0.9} transparent opacity={0.95} />
        </mesh>
        {lightsOn && <pointLight position={[0, h - r, 0]} intensity={2.2} distance={11} decay={2} color="#FFE0B0" />}
      </group>
    );
  }

  const shadeH = Math.min(1.05, h * 0.2);
  return (
    <group>
      <mesh position={[0, 0.055, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[w * 0.42, w * 0.46, 0.11, SEG]} />
        <meshStandardMaterial color={metal} roughness={0.35} metalness={0.75} />
      </mesh>
      <mesh position={[0, (h - shadeH) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, h - shadeH, 10]} />
        <meshStandardMaterial color={metal} roughness={0.32} metalness={0.8} />
      </mesh>
      <mesh position={[0, h - shadeH / 2, 0]} castShadow>
        <cylinderGeometry args={[w * 0.44, w * 0.56, shadeH, SEG, 1, true]} />
        <meshStandardMaterial color={shadeColor} roughness={0.8} side={THREE.DoubleSide} emissive="#FFE3B4" emissiveIntensity={glow * 0.5} />
      </mesh>
      {lightsOn && <pointLight position={[0, h - shadeH, 0]} intensity={2.2} distance={11} decay={2} color="#FFE0B0" />}
    </group>
  );
}

/* ----------------------------------------------------------- case goods */

const BOOK_COLORS = ["#7E4A38", "#2F4B44", "#8A7A5A", "#3B3A46", "#A9603E", "#54606B", "#C2B69A"];

function Shelf({ product }: PieceProps) {
  const { width: w, depth: d, height: h } = product;
  const hint = hints(product);
  const wood = product.color;
  const panel = 0.09;
  const tiers = Math.max(3, Math.round(h / 1.35));
  const rand = useMemo(() => seeded(product.id), [product.id]);
  const gap = (h - panel) / tiers;

  const shelves = Array.from({ length: tiers + 1 }, (_, i) => {
    const y = i * gap + panel / 2;
    // a ladder shelf steps back, deepest at the floor
    const depth = hint.ladder ? d * (1 - (i / (tiers + 1)) * 0.45) : d;
    return { y, depth };
  });

  return (
    <group rotation={[hint.ladder ? -0.05 : 0, 0, 0]}>
      {/* sides */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (w / 2 - panel / 2), h / 2, hint.ladder ? -d * 0.1 : 0]} castShadow receiveShadow>
          <boxGeometry args={[panel, h, hint.ladder ? d * 0.55 : d]} />
          <meshStandardMaterial color={shade(wood, -0.05)} roughness={0.6} />
        </mesh>
      ))}
      {!hint.ladder && (
        <mesh position={[0, h / 2, -d / 2 + 0.03]} receiveShadow>
          <boxGeometry args={[w - panel * 2, h - 0.1, 0.05]} />
          <meshStandardMaterial color={shade(wood, -0.2)} roughness={0.75} />
        </mesh>
      )}
      {shelves.map((s, i) => (
        <group key={i}>
          <mesh position={[0, s.y, hint.ladder ? (d - s.depth) / -2 : 0]} castShadow receiveShadow>
            <boxGeometry args={[w - panel * 2, panel, s.depth]} />
            <meshStandardMaterial color={wood} roughness={0.6} />
          </mesh>
          {/* books, skipping the top surface */}
          {i < shelves.length - 1 &&
            Array.from({ length: Math.round(3 + rand() * 5) }).map((_, b, arr) => {
              const bw = 0.1 + rand() * 0.14;
              const bh = Math.min(gap - 0.28, 0.62 + rand() * 0.36);
              const span = (w - panel * 2) * 0.78;
              const x = -span / 2 + (span / arr.length) * (b + 0.5);
              const lean = rand() > 0.86 ? 0.16 : 0;
              return (
                <mesh
                  key={b}
                  position={[x, s.y + panel / 2 + bh / 2, (hint.ladder ? (d - s.depth) / -2 : 0) + 0.05]}
                  rotation={[0, 0, lean]}
                  castShadow
                >
                  <boxGeometry args={[bw, bh, Math.min(0.72, s.depth * 0.62)]} />
                  <meshStandardMaterial color={BOOK_COLORS[Math.floor(rand() * BOOK_COLORS.length)]} roughness={0.85} />
                </mesh>
              );
            })}
        </group>
      ))}
    </group>
  );
}

/** Dressers and nightstands: a carcass, real drawer fronts, brass pulls. */
function CaseGood({ product }: PieceProps) {
  const { width: w, depth: d, height: h } = product;
  const body = product.color;
  const legH = Math.min(0.42, h * 0.16);
  const caseH = h - legH;
  const rows = Math.max(1, Math.min(4, Math.round(caseH / 0.82)));
  const cols = w > 3.4 ? 2 : 1;
  const cellW = (w - 0.12) / cols;
  const cellH = (caseH - 0.12) / rows;

  return (
    <group>
      <RoundedBox args={[w, caseH, d]} radius={safeRadius(0.04, w, caseH, d)} smoothness={2} position={[0, legH + caseH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={body} roughness={0.6} />
      </RoundedBox>
      {Array.from({ length: rows * cols }).map((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const x = -w / 2 + 0.06 + cellW * (c + 0.5);
        const y = legH + caseH - 0.06 - cellH * (r + 0.5);
        return (
          <group key={i} position={[x, y, d / 2 + 0.012]}>
            <RoundedBox args={[cellW - 0.07, cellH - 0.07, 0.05]} radius={safeRadius(0.02, cellW - 0.07, cellH - 0.07, 0.05)} smoothness={2} castShadow>
              <meshStandardMaterial color={shade(body, 0.05)} roughness={0.58} />
            </RoundedBox>
            <mesh position={[0, 0, 0.055]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.032, 0.032, Math.min(0.9, cellW * 0.36), 10]} />
              <meshStandardMaterial color={BRASS} roughness={0.3} metalness={0.88} />
            </mesh>
          </group>
        );
      })}
      <Legs w={w} d={d} top={legH} color={legTone(product)} inset={0.2} radius={0.055} />
    </group>
  );
}

/* --------------------------------------------------------- art and mirror */

function Art({ product }: PieceProps) {
  const { width: w, height: h } = product;
  const frameD = Math.max(0.08, product.depth);
  const map = useMemo(() => artTexture(product.color, product.id), [product.color, product.id]);
  const frameColor = shade(product.color, luminance(product.color) > 0.5 ? -0.55 : 0.1);
  return (
    <group>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[w, h, frameD]} />
        <meshStandardMaterial color={frameColor} roughness={0.45} metalness={0.15} />
      </mesh>
      <mesh position={[0, 0, frameD / 2 + 0.004]}>
        <planeGeometry args={[w - 0.22, h - 0.22]} />
        <meshStandardMaterial map={map || undefined} color={map ? "#ffffff" : product.color} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Mirror({ product }: PieceProps) {
  const { width: w, height: h } = product;
  const hint = hints(product);
  const frameColor = legTone(product);
  const depth = Math.max(0.12, product.depth);

  const shapes = useMemo(() => {
    function arch(halfW: number, top: number, arched: boolean) {
      const s = new THREE.Shape();
      const r = arched ? Math.min(halfW, top * 0.5) : 0;
      s.moveTo(-halfW, 0);
      s.lineTo(-halfW, top - r);
      if (arched) s.absarc(0, top - r, r, Math.PI, 0, true);
      else s.lineTo(halfW, top);
      s.lineTo(halfW, 0);
      s.closePath();
      return s;
    }
    const arched = hint.arch || hint.round;
    return { frame: arch(w / 2, h, arched), glass: arch(w / 2 - 0.11, h - 0.11, arched) };
  }, [w, h, hint.arch, hint.round]);

  return (
    <group rotation={[-0.04, 0, 0]}>
      <mesh castShadow receiveShadow position={[0, 0, -depth / 2]}>
        <extrudeGeometry args={[shapes.frame, { depth, bevelEnabled: false, curveSegments: 24 }]} />
        <meshStandardMaterial color={frameColor} roughness={0.32} metalness={0.85} />
      </mesh>
      <mesh position={[0, 0.06, depth / 2 + 0.005]}>
        <extrudeGeometry args={[shapes.glass, { depth: 0.02, bevelEnabled: false, curveSegments: 24 }]} />
        <meshStandardMaterial color="#C9D5DA" roughness={0.05} metalness={1} envMapIntensity={3.4} />
      </mesh>
    </group>
  );
}

/* ----------------------------------------------------------------- plants */

function Plant({ product }: PieceProps) {
  const { width: w, height: h } = product;
  const leaf = product.color;
  const potH = Math.min(1.35, h * 0.26);
  const potR = Math.max(0.4, w * 0.32);
  const trunkTop = h * 0.55;
  // Leaves spiral off the stem, each tilted outward and down like real growth.
  const canopy = useMemo(() => {
    const r = seeded(product.id + "canopy");
    const count = 18;
    return Array.from({ length: count }).map((_, i) => {
      const t = i / (count - 1);
      const a = i * 2.399 + r() * 0.3;
      const len = w * (0.3 + r() * 0.16) * (1 - t * 0.35);
      const reach = len * (0.75 + r() * 0.3);
      const y = trunkTop * 0.72 + (h - trunkTop * 0.72) * (0.08 + t * 0.9);
      return {
        pos: [Math.cos(a) * reach, y, Math.sin(a) * reach] as [number, number, number],
        rot: [0, -a + Math.PI / 2, 0.5 + r() * 0.5] as [number, number, number],
        len,
        tone: shade(leaf, (r() - 0.45) * 0.34)
      };
    });
  }, [product.id, w, h, trunkTop, leaf]);

  return (
    <group>
      <mesh position={[0, potH / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[potR, potR * 0.78, potH, SEG]} />
        <meshStandardMaterial color="#B7A492" roughness={0.85} />
      </mesh>
      <mesh position={[0, potH - 0.04, 0]}>
        <cylinderGeometry args={[potR * 0.94, potR * 0.94, 0.08, SEG]} />
        <meshStandardMaterial color="#3B322A" roughness={1} />
      </mesh>
      {[0, 1].map((i) => (
        <mesh key={i} position={[(i - 0.5) * w * 0.12, (potH + trunkTop) / 2, 0]} rotation={[0, 0, (i - 0.5) * 0.14]} castShadow>
          <cylinderGeometry args={[0.05, 0.075, trunkTop - potH, 8]} />
          <meshStandardMaterial color="#6B5A45" roughness={0.85} />
        </mesh>
      ))}
      {canopy.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={c.rot} scale={[c.len * 1.5, c.len * 0.16, c.len]} castShadow>
          <sphereGeometry args={[1, 10, 7]} />
          <meshStandardMaterial color={c.tone} roughness={0.68} />
        </mesh>
      ))}
    </group>
  );
}


/**
 * A wall-mounted panel, screen facing +z like every other front. Mounted rather
 * than stood on a stand because a screen belongs at seated eye level, which no
 * pedestal short enough to sit under it can reach.
 */
function Television({ product }: PieceProps) {
  const { width: w, height: h } = product;
  const { lightsOn } = useContext(SceneMode);
  const body = product.color;
  const bezel = 0.05;

  return (
    <group>
      {/* wall bracket, just visible behind the panel */}
      <mesh position={[0, 0, -0.09]} castShadow>
        <boxGeometry args={[w * 0.28, h * 0.42, 0.12]} />
        <meshStandardMaterial color="#2A2B2E" roughness={0.6} metalness={0.3} />
      </mesh>

      <RoundedBox args={[w, h, 0.1]} radius={safeRadius(0.02, w, h, 0.1)} smoothness={2} castShadow receiveShadow>
        <meshStandardMaterial color={body} roughness={0.45} metalness={0.5} />
      </RoundedBox>

      {/* screen: dark and reflective by day, lit in the evening */}
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[w - bezel * 2, h - bezel * 2]} />
        <meshStandardMaterial
          color={lightsOn ? "#20344E" : "#0B0C10"}
          roughness={0.08}
          metalness={0.85}
          envMapIntensity={1.6}
          emissive={lightsOn ? "#22405F" : "#000000"}
          emissiveIntensity={lightsOn ? 0.55 : 0}
        />
      </mesh>
    </group>
  );
}

/* --------------------------------------------------------------- fallback */

function Block({ product }: PieceProps) {
  const finish = finishFor(product);
  return (
    <RoundedBox
      args={[product.width, product.height, product.depth]}
      radius={safeRadius(0.06, product.width, product.height, product.depth)}
      smoothness={2}
      position={[0, product.height / 2, 0]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial color={product.color} roughness={finish.roughness} metalness={finish.metalness} />
    </RoundedBox>
  );
}

/* ------------------------------------------------------------- dispatcher */

/** Builds a piece with its base on y=0, facing +z, centered on x/z. */
export function FurnitureModel({ product }: PieceProps) {
  switch (product.category) {
    case "sofa":
      return <Upholstered product={product} />;
    case "chair":
      return <Chair product={product} />;
    case "table":
      return <Table product={product} />;
    case "desk":
      return <Desk product={product} />;
    case "bed":
      return <Bed product={product} />;
    case "rug":
      return <Rug product={product} />;
    case "lamp":
      return <Lamp product={product} />;
    case "shelf":
      return <Shelf product={product} />;
    case "dresser":
    case "nightstand":
      return <CaseGood product={product} />;
    case "art":
      return <Art product={product} />;
    case "mirror":
      return <Mirror product={product} />;
    case "tv":
      return <Television product={product} />;
    case "plant":
      return <Plant product={product} />;
    default:
      return <Block product={product} />;
  }
}
