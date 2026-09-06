"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Camera, Download, Image as ImageIcon, Loader2, Moon, Sparkles, Sun, X } from "lucide-react";
import type { DetectedRoom, PlacedItem, Product, RoomSpec } from "@/lib/types";
import { WALL_HEIGHT_FT, isWallHung, mountCenterY, wallToneFrom, yawFor } from "@/lib/furniture";
import { FurnitureModel, SceneMode } from "./furniture/pieces";
import { PhotoPiece, useCutout } from "./furniture/PhotoPiece";
import { RoomShell } from "./furniture/RoomShell";
import { StudioEnvironment } from "./furniture/StudioEnvironment";

/**
 * The rendered view. Same placements, same dimensions and same fit verdicts as
 * the plan and the block view, drawn as furniture in a lit room.
 *
 * In photo mode each piece is the listing's own photo, cut out of its backdrop
 * and stood up at its measured size, so the room contains the exact product the
 * shopper picked. A listing whose photo is a styled room scene has no clean
 * silhouette to cut, and falls back to the built model for that piece.
 */

type Look = "photo" | "model";

interface Props {
  room: RoomSpec;
  detected?: DetectedRoom | null;
  products: Product[];
  placed: PlacedItem[];
  selectedId: string | null;
  onSelect?: (id: string | null) => void;
}

const FIT_RING: Record<string, string> = {
  conflict: "#EF4444",
  tight: "#F59E0B",
  fits: "#0C0C0D",
  unverified: "#6E6C67"
};

function Piece({
  item,
  product,
  room,
  look,
  selected,
  onSelect
}: {
  item: PlacedItem;
  product: Product;
  room: RoomSpec;
  look: Look;
  selected: boolean;
  onSelect?: (id: string | null) => void;
}) {
  const holder = useRef<THREE.Group>(null);
  // An unverified stock image is decoration, not evidence of what the product
  // looks like, so it never gets stood up in the room.
  const trusted = product.photoVerified || product.image?.startsWith("/");
  const cutout = useCutout(look === "photo" && trusted ? product.image : "");
  const x = item.x - room.widthFt / 2;
  const z = item.y - room.depthFt / 2;
  const yaw = yawFor(item, product, room);
  const hung = isWallHung(product);
  const y = hung ? mountCenterY(product) : 0;
  const ring = Math.max(product.width, product.depth) / 2;
  const showRing = selected || item.fit === "conflict" || item.fit === "tight";
  const asPhoto = look === "photo" && cutout.status === "ready";

  // A framed piece belongs to the wall behind it: when that wall hides itself
  // for the camera, the art has to go with it or it floats in mid-air.
  const wall = useMemo(() => {
    if (!hung) return null;
    const gaps = [
      { side: "N" as const, gap: item.y },
      { side: "S" as const, gap: room.depthFt - item.y },
      { side: "W" as const, gap: item.x },
      { side: "E" as const, gap: room.widthFt - item.x }
    ];
    return gaps.sort((a, b) => a.gap - b.gap)[0].side;
  }, [hung, item.x, item.y, room.widthFt, room.depthFt]);

  useFrame(({ camera }) => {
    if (!holder.current || !wall) return;
    const p = camera.position;
    holder.current.visible =
      wall === "N" ? p.z > -room.depthFt / 2 : wall === "S" ? p.z < room.depthFt / 2 : wall === "W" ? p.x > -room.widthFt / 2 : p.x < room.widthFt / 2;
  });

  return (
    <group ref={holder}>
      {asPhoto ? (
        <PhotoPiece item={item} product={product} room={room} cutout={cutout} onSelect={onSelect} />
      ) : (
        <group
          position={[x, y, z]}
          rotation={[0, yaw, 0]}
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(product.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = "auto";
          }}
        >
          <FurnitureModel product={product} />
        </group>
      )}

      {showRing && (
        <mesh position={[x, 0.035, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[ring * 1.02, ring * 1.02 + (selected ? 0.14 : 0.08), 56]} />
          <meshBasicMaterial
            color={selected ? "#F2B441" : FIT_RING[item.fit]}
            transparent
            opacity={selected ? 0.95 : 0.7}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
}

/** Hands a PNG grab back out of the canvas. */
function Snapshot({ bind }: { bind: (fn: () => string) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    bind(() => {
      gl.render(scene, camera);
      return gl.domElement.toDataURL("image/png");
    });
  }, [gl, scene, camera, bind]);
  return null;
}

function Rig({ room, lightsOn }: { room: RoomSpec; lightsOn: boolean }) {
  const reach = Math.max(room.widthFt, room.depthFt);
  return (
    <>
      <ambientLight intensity={lightsOn ? 0.16 : 0.32} color={lightsOn ? "#F0D9B5" : "#FFFFFF"} />
      <hemisphereLight args={[lightsOn ? "#3B4257" : "#DCE9F5", lightsOn ? "#241C14" : "#8A7A63", lightsOn ? 0.2 : 0.6]} />
      <directionalLight
        position={[reach * 0.7, WALL_HEIGHT_FT * 1.7, -reach * 0.55]}
        intensity={lightsOn ? 0.35 : 1.85}
        color={lightsOn ? "#8FA4C4" : "#FFF4E2"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.03}
      >
        <orthographicCamera attach="shadow-camera" args={[-reach, reach, reach, -reach, 0.5, reach * 5]} />
      </directionalLight>
      {lightsOn && <pointLight position={[0, WALL_HEIGHT_FT - 0.6, 0]} intensity={5} distance={reach * 2.2} decay={2} color="#FFD9A6" />}
      <StudioEnvironment warm={lightsOn} />
    </>
  );
}

const TOOL_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1 uppercase tracking-[0.16em] transition hover:border-ink hover:text-ink disabled:opacity-50";

export function RenderScene({ room, detected, products, placed, selectedId, onSelect }: Props) {
  const [lightsOn, setLightsOn] = useState(false);
  const [look, setLook] = useState<Look>("photo");
  const [photoreal, setPhotoreal] = useState<{ status: "idle" | "working" | "done" | "error"; image?: string; error?: string }>({ status: "idle" });
  const grab = useRef<(() => string) | null>(null);
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const mode = useMemo(() => ({ lightsOn }), [lightsOn]);

  const reach = Math.max(room.widthFt, room.depthFt);
  const bind = useCallback((fn: () => string) => {
    grab.current = fn;
  }, []);

  function download(href: string, name: string) {
    const link = document.createElement("a");
    link.download = name;
    link.href = href;
    link.click();
  }

  function exportPng() {
    if (!grab.current) return;
    download(grab.current(), `sightline-room-${room.widthFt.toFixed(0)}x${room.depthFt.toFixed(0)}.png`);
  }

  async function renderPhotoreal() {
    setPhotoreal({ status: "working" });
    const pieces = placed
      .map((item) => {
        const product = byId[item.productId];
        if (!product) return null;
        return {
          title: product.title,
          category: product.category,
          source: product.source,
          image: product.image,
          x: item.x,
          y: item.y,
          rotation: item.rotation,
          width: product.width,
          depth: product.depth,
          height: product.height
        };
      })
      .filter(Boolean);

    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // the frame on screen right now is the layout to match
          layoutImage: grab.current?.(),
          widthFt: room.widthFt,
          depthFt: room.depthFt,
          style: room.style,
          roomType: room.roomType,
          palette: detected?.palette,
          lightingNote: detected?.lightingNote,
          pieces
        })
      });
      const json = await res.json();
      if (!res.ok) return setPhotoreal({ status: "error", error: json?.error || `Render failed (${res.status}).` });
      setPhotoreal({ status: "done", image: json.image });
    } catch (err) {
      setPhotoreal({ status: "error", error: err instanceof Error ? err.message : "Render failed." });
    }
  }

  useEffect(() => () => {
    document.body.style.cursor = "auto";
  }, []);

  return (
    <div className="card h-[560px]">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-ash">
        <span className="flex items-center gap-2">
          <Camera className="h-3 w-3" /> Rendered · drag to orbit · click a piece
        </span>
        <div className="flex items-center gap-2">
          <button onClick={() => setLook((v) => (v === "photo" ? "model" : "photo"))} className={TOOL_BUTTON} title="Real listing photos, or the built furniture models">
            <ImageIcon className="h-3 w-3" />
            {look === "photo" ? "Real photos" : "Models"}
          </button>
          <button onClick={() => setLightsOn((v) => !v)} className={TOOL_BUTTON} title="Toggle daylight and lamplight">
            {lightsOn ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
            {lightsOn ? "Evening" : "Daylight"}
          </button>
          <button onClick={renderPhotoreal} disabled={photoreal.status === "working"} className={TOOL_BUTTON} title="Render this exact room with Gemini">
            {photoreal.status === "working" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Photoreal
          </button>
          <button onClick={exportPng} className={TOOL_BUTTON} title="Save this view as a PNG">
            <Download className="h-3 w-3" /> PNG
          </button>
        </div>
      </div>

      <div className="relative h-[500px] w-full">
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          onCreated={({ gl }) => {
            gl.toneMappingExposure = 0.95;
          }}
          camera={{ position: [reach * 0.85, WALL_HEIGHT_FT * 0.72, room.depthFt * 1.15], fov: 42 }}
          onPointerMissed={() => onSelect?.(null)}
        >
          <color attach="background" args={[lightsOn ? "#0B0B0D" : "#141416"]} />
          <fog attach="fog" args={[lightsOn ? "#0B0B0D" : "#141416", reach * 3.4, reach * 7]} />
          <Rig room={room} lightsOn={lightsOn} />

          <SceneMode.Provider value={mode}>
            <RoomShell
              widthFt={room.widthFt}
              depthFt={room.depthFt}
              openings={detected?.openings || []}
              wallColor={wallToneFrom(detected?.palette)}
              lightsOn={lightsOn}
            />

            {(detected?.existing || []).map((e, i) => (
              <mesh key={i} position={[e.x - room.widthFt / 2, 1.05, e.y - room.depthFt / 2]}>
                <boxGeometry args={[e.widthFt, 2.1, e.depthFt]} />
                <meshStandardMaterial color="#B8B4AA" transparent opacity={0.16} depthWrite={false} />
              </mesh>
            ))}

            {placed.map((item) => {
              const product = byId[item.productId];
              if (!product) return null;
              return (
                <Piece
                  key={item.productId}
                  item={item}
                  product={product}
                  room={room}
                  look={look}
                  selected={selectedId === item.productId}
                  onSelect={onSelect}
                />
              );
            })}
          </SceneMode.Provider>

          <ContactShadows position={[0, 0.015, 0]} opacity={lightsOn ? 0.5 : 0.34} blur={2.2} scale={reach * 2} far={4} resolution={1024} />
          <OrbitControls
            enablePan
            enableDamping
            dampingFactor={0.08}
            minDistance={3.5}
            maxDistance={reach * 4}
            maxPolarAngle={Math.PI / 2 - 0.04}
            target={[0, 2.2, 0]}
          />
          <Snapshot bind={bind} />
        </Canvas>

        {photoreal.status !== "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel/95 p-4">
            {photoreal.status === "working" && (
              <div className="text-center text-paper">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <div className="mt-4 font-display text-2xl">Rendering the room</div>
                <div className="mt-1 text-[12px] opacity-70">Sending your dimensions and the real listing photos to Gemini.</div>
              </div>
            )}
            {photoreal.status === "error" && (
              <div className="max-w-md text-center text-paper">
                <div className="font-display text-2xl">Could not render</div>
                <div className="mt-2 text-[12px] leading-relaxed opacity-80">{photoreal.error}</div>
                <button onClick={() => setPhotoreal({ status: "idle" })} className="btn btn-light mt-5 text-xs">
                  Back to 3D
                </button>
              </div>
            )}
            {photoreal.status === "done" && photoreal.image && (
              <div className="flex h-full w-full flex-col">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoreal.image} alt="Photoreal render of the room" className="min-h-0 flex-1 rounded-xl object-contain" />
                <div className="mt-3 flex shrink-0 items-center justify-center gap-2">
                  <button onClick={() => setPhotoreal({ status: "idle" })} className="btn btn-light text-xs">
                    <X className="h-3.5 w-3.5" /> Back to 3D
                  </button>
                  <button onClick={() => download(photoreal.image as string, "sightline-photoreal.png")} className="btn btn-brass text-xs">
                    <Download className="h-3.5 w-3.5" /> Save
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
