"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Camera, Download, Gauge, Image as ImageIcon, Loader2, Moon, Sparkles, Sun, X } from "lucide-react";
import type { DetectedRoom, PlacedItem, Product, RoomSpec, Viewpoint } from "@/lib/types";
import { WALL_HEIGHT_FT, establishingShot, isWallHung, mountCenterY, roomTones, yawFor } from "@/lib/furniture";
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
  /** Render the photograph straight away: this is the realistic view, not the 3D one. */
  auto?: boolean;
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

/** Longest edge of the frame sent to the image model. */
const REFERENCE_EDGE = 1280;

/**
 * Hands two grabs back out of the canvas: a lossless PNG for the shopper's own
 * export, and a smaller JPEG for the image model.
 *
 * The model needs the frame for its geometry, not its pixels, so sending a
 * full-resolution PNG at 2x device scale means megabytes uploaded twice, from
 * the browser to us and from us to the provider, for structure a fraction of
 * the size carries just as well.
 */
function Snapshot({ bind, bindReference }: { bind: (fn: () => string) => void; bindReference: (fn: () => string) => void }) {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    const draw = () => {
      gl.render(scene, camera);
      return gl.domElement;
    };
    bind(() => draw().toDataURL("image/png"));
    bindReference(() => {
      const source = draw();
      const scale = Math.min(1, REFERENCE_EDGE / Math.max(source.width, source.height));
      const shrunk = scale < 1 ? document.createElement("canvas") : null;
      const ctx = shrunk?.getContext("2d");
      if (shrunk && ctx) {
        shrunk.width = Math.round(source.width * scale);
        shrunk.height = Math.round(source.height * scale);
        ctx.drawImage(source, 0, 0, shrunk.width, shrunk.height);
      }
      return (shrunk && ctx ? shrunk : source).toDataURL("image/jpeg", 0.85);
    });
  }, [gl, scene, camera, bind, bindReference]);
  return null;
}

/**
 * Points the live camera at the establishing shot.
 *
 * Inside the Canvas because the fit depends on the real aspect of the drawn
 * frame. It deliberately does not re-run on resize: once the shopper has
 * orbited, the view is theirs, and the render follows whatever they are
 * looking at.
 */
function Frame({ room, viewpoint }: { room: RoomSpec; viewpoint?: Viewpoint | null }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const shot = establishingShot(room.widthFt, room.depthFt, size.width / size.height, viewpoint);
    camera.position.set(...shot.position);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = shot.fov;
      camera.updateProjectionMatrix();
    }
    camera.lookAt(...shot.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, room.widthFt, room.depthFt, viewpoint?.x, viewpoint?.y, viewpoint?.heightFt]);
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

/** How long the layout must hold still before a render is worth starting. */
const PREFETCH_SETTLE_MS = 2500;

const TOOL_BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-rule px-3 py-1 uppercase tracking-[0.16em] transition hover:border-ink hover:text-ink disabled:opacity-50";

export function RenderScene({ room, detected, products, placed, selectedId, onSelect, auto = false }: Props) {
  const [lightsOn, setLightsOn] = useState(false);
  const [look, setLook] = useState<Look>("photo");
  const [photoreal, setPhotoreal] = useState<{
    status: "idle" | "working" | "done" | "error";
    image?: string;
    error?: string;
    provider?: string;
    model?: string;
    ms?: number;
    providerMs?: number;
  }>({ status: "idle" });
  const grab = useRef<(() => string) | null>(null);
  const grabReference = useRef<(() => string) | null>(null);
  const [speed, setSpeed] = useState<"fast" | "best">("fast");
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const mode = useMemo(() => ({ lightsOn }), [lightsOn]);
  // The same surfaces the block view draws, so the photograph generated from
  // this frame is of the room the shopper was just looking at.
  const tones = useMemo(() => roomTones(detected), [detected]);
  // A first guess at the framing, refined inside the Canvas once the drawn
  // frame's real aspect is known.
  const opening = useMemo(
    () => establishingShot(room.widthFt, room.depthFt, 16 / 9, detected?.viewpoint),
    [room.widthFt, room.depthFt, detected?.viewpoint]
  );

  const reach = Math.max(room.widthFt, room.depthFt);
  const bind = useCallback((fn: () => string) => {
    grab.current = fn;
  }, []);
  const bindReference = useCallback((fn: () => string) => {
    grabReference.current = fn;
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

  /**
   * A render is worth keeping: the same room, the same pieces and the same
   * speed produce the same picture, so coming back to this tab should not cost
   * another half minute and another call.
   */
  function signature(pieces: unknown, mode: string) {
    return `sightline:render:${mode}:${JSON.stringify(pieces)}`;
  }

  function cached(key: string) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  /** What the render is of, independent of the frame that illustrates it. */
  function piecesForRender() {
    return placed
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
  }

  /**
   * One render. `onFrame` is called for every partial and for the final image,
   * so the visible render can show progress while a prefetch stays quiet.
   */
  async function requestRender(
    pieces: unknown[],
    onFrame?: (frame: { image: string; provider?: string; model?: string; ms?: number; providerMs?: number; final: boolean }) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const payload = JSON.stringify({
      layoutImage: grabReference.current?.(),
      speed,
      stream: true,
      widthFt: room.widthFt,
      depthFt: room.depthFt,
      style: room.style,
      roomType: room.roomType,
      palette: detected?.palette,
      lightingNote: detected?.lightingNote,
      pieces
    });

    const res = await fetch("/api/render", { method: "POST", headers: { "content-type": "application/json" }, body: payload, signal });

    // Streaming replies arrive as events; everything else is one JSON body.
    if (res.ok && res.headers.get("content-type")?.includes("text/event-stream") && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let latest = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";
        for (const block of blocks) {
          const line = block.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let event: any;
          try {
            event = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (event.type === "error") throw new Error(event.error);
          if (!event.image) continue;
          latest = event.image;
          onFrame?.({ image: event.image, provider: event.provider, model: event.model, ms: event.ms, providerMs: event.providerMs, final: event.type === "done" });
        }
      }
      if (!latest) throw new Error("The render finished without producing an image.");
      return latest;
    }

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || `Render failed (${res.status}).`);
    onFrame?.({ image: json.image, provider: json.provider, model: json.model, ms: json.ms, providerMs: json.providerMs, final: true });
    return json.image;
  }

  function remember(key: string, image: string) {
    try {
      sessionStorage.setItem(key, image);
    } catch {
      /* a full or blocked store just means no cache */
    }
  }

  async function renderPhotoreal(force = false) {
    const pieces = piecesForRender();
    const key = signature(pieces, speed);
    if (!force) {
      const hit = cached(key);
      if (hit) return setPhotoreal({ status: "done", image: hit, ms: 0 });
    }

    setPhotoreal({ status: "working" });
    try {
      const image = await requestRender(pieces, (frame) =>
        setPhotoreal({
          status: frame.final ? "done" : "working",
          image: frame.image,
          provider: frame.provider,
          model: frame.model,
          ms: frame.ms,
          providerMs: frame.providerMs
        })
      );
      setPhotoreal((prev) => ({ ...prev, status: "done", image }));
      remember(key, image);
    } catch (err) {
      setPhotoreal({ status: "error", error: err instanceof Error ? err.message : "Render failed." });
    }
  }

  useEffect(() => () => {
    document.body.style.cursor = "auto";
  }, []);

  // In the realistic view the photograph is the view, so it renders on arrival
  // rather than waiting to be asked. It still needs a drawn frame to send, so
  // this waits for the canvas to have painted one.
  /**
   * Start the render while the shopper is still looking at the 3D view, so the
   * realistic one is already waiting when they reach it.
   *
   * The cost is real and worth stating: a room nobody opens in the realistic
   * view is a render nobody looks at, and on a paid provider that is money. So
   * it waits for the layout to stop changing, never runs twice for the same
   * room, keeps one request in flight, and abandons a request the moment the
   * layout moves under it. Set NEXT_PUBLIC_RENDER_PREFETCH=off to turn it off.
   */
  const inFlight = useRef<AbortController | null>(null);
  useEffect(() => {
    if (auto || process.env.NEXT_PUBLIC_RENDER_PREFETCH === "off") return;

    const pieces = piecesForRender();
    if (!pieces.length) return;
    const key = signature(pieces, speed);
    if (cached(key)) return;

    const timer = setTimeout(async () => {
      if (!grabReference.current) return;
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;
      try {
        const image = await requestRender(pieces, undefined, controller.signal);
        if (!controller.signal.aborted) remember(key, image);
      } catch {
        // A prefetch failing is not the shopper's problem: they have not asked
        // for the picture yet, and asking will surface any real error.
      } finally {
        if (inFlight.current === controller) inFlight.current = null;
      }
    }, PREFETCH_SETTLE_MS);

    return () => {
      clearTimeout(timer);
      inFlight.current?.abort();
      inFlight.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, placed, products, speed]);

  const kicked = useRef(false);
  useEffect(() => {
    if (!auto || kicked.current) return;

    // A room already rendered needs nothing from the canvas, so it shows at
    // once rather than waiting on a frame it is not going to send.
    const hit = cached(signature(piecesForRender(), speed));
    if (hit) {
      kicked.current = true;
      setPhotoreal({ status: "done", image: hit, ms: 0 });
      return;
    }

    const timer = setTimeout(() => {
      if (!grab.current) return;
      kicked.current = true;
      renderPhotoreal();
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, placed, speed]);

  return (
    <div className="card h-[560px]">
      <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3 text-[10px] uppercase tracking-[0.16em] text-ash">
        <span className="flex items-center gap-2">
          <Camera className="h-3 w-3" /> {auto ? "Realistic · generated from your chosen products" : "Rendered · drag to orbit · click a piece"}
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
          <button
            onClick={() => setSpeed((v) => (v === "fast" ? "best" : "fast"))}
            className={TOOL_BUTTON}
            title="Fast trades some rendering quality for a much shorter wait"
          >
            <Gauge className="h-3 w-3" />
            {speed === "fast" ? "Fast" : "Best"}
          </button>
          <button onClick={() => renderPhotoreal()} disabled={photoreal.status === "working"} className={TOOL_BUTTON} title="Render this room from the pieces you chose">
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
          camera={{ position: opening.position, fov: opening.fov }}
          onPointerMissed={() => onSelect?.(null)}
        >
          <color attach="background" args={[lightsOn ? "#0B0B0D" : "#141416"]} />
          <fog attach="fog" args={[lightsOn ? "#0B0B0D" : "#141416", reach * 3.4, reach * 7]} />
          <Frame room={room} viewpoint={detected?.viewpoint} />
          <Rig room={room} lightsOn={lightsOn} />

          <SceneMode.Provider value={mode}>
            <RoomShell
              widthFt={room.widthFt}
              depthFt={room.depthFt}
              openings={detected?.openings || []}
              wallColor={tones.wallColor}
              floorColor={tones.floorColor}
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
            target={opening.target}
          />
          <Snapshot bind={bind} bindReference={bindReference} />
        </Canvas>

        {photoreal.status !== "idle" && (
          <div className="absolute inset-0 flex items-center justify-center bg-panel/95 p-4">
            {photoreal.status === "working" && (
              <div className="flex h-full w-full flex-col items-center justify-center text-center text-ink">
                {photoreal.image ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoreal.image} alt="Render in progress" className="min-h-0 flex-1 rounded-xl object-contain" />
                    <div className="mt-3 flex items-center gap-2 text-[12px] opacity-70">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sharpening…
                    </div>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <div className="mt-4 font-display text-2xl">Rendering the room</div>
                    <div className="mt-1 text-[12px] opacity-70">Sending the layout and the photos of the pieces you chose.</div>
                  </>
                )}
              </div>
            )}
            {photoreal.status === "error" && (
              <div className="max-w-md text-center text-ink">
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
                <div className="mt-3 flex shrink-0 flex-wrap items-center justify-center gap-2">
                  {photoreal.provider && (
                    <span className="text-[11px] text-ink/60">
                      {photoreal.provider} · {photoreal.model} · {((photoreal.ms || 0) / 1000).toFixed(1)}s
                      {photoreal.providerMs ? ` (${((photoreal.providerMs || 0) / 1000).toFixed(1)}s in the model)` : ""}
                    </span>
                  )}
                  <button onClick={() => renderPhotoreal(true)} className="btn btn-light text-xs">
                    <Sparkles className="h-3.5 w-3.5" /> Render again
                  </button>
                  {!auto && (
                    <button onClick={() => setPhotoreal({ status: "idle" })} className="btn btn-light text-xs">
                      <X className="h-3.5 w-3.5" /> Back to 3D
                    </button>
                  )}
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
