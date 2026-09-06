"use client";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { PlacedItem, Product, RoomSpec } from "@/lib/types";
import { hangCenterY, yawFor } from "@/lib/furniture";
import { loadCutout, type CutoutState } from "./cutout";
import { SceneMode } from "./pieces";
import { shadowBlobTexture } from "./textures";

/**
 * The listing's own photo, standing in the room at its measured size.
 *
 * This is the piece the shopper would actually receive: the exact Target sofa,
 * not a sofa-shaped approximation of it. The cutout turns to face the camera so
 * it always reads, while its shadow on the floor stays locked to the real
 * footprint and rotation, so the plan and the room still agree about the space
 * the piece occupies.
 */

export function useCutout(url: string) {
  const [state, setState] = useState<CutoutState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    loadCutout(url).then((s) => live && setState(s));
    return () => {
      live = false;
    };
  }, [url]);
  return state;
}

interface Props {
  item: PlacedItem;
  product: Product;
  room: RoomSpec;
  cutout: Extract<CutoutState, { status: "ready" }>;
  onSelect?: (id: string | null) => void;
}

/**
 * Photos are lit by the shot they were taken in, so re-lighting them here only
 * washes the product out. They render unlit at their true colors and take a
 * warm tint in evening mode so they still sit in the room.
 */
const PHOTO_MATERIAL = {
  transparent: true,
  alphaTest: 0.35,
  side: THREE.DoubleSide
} as const;

export function PhotoPiece({ item, product, room, cutout, onSelect }: Props) {
  const board = useRef<THREE.Group>(null);
  const x = item.x - room.widthFt / 2;
  const z = item.y - room.depthFt / 2;
  const yaw = yawFor(item, product, room);
  const blob = useMemo(() => shadowBlobTexture(), []);
  const { lightsOn } = useContext(SceneMode);
  const tint = lightsOn ? "#C6A87E" : "#FFFFFF";

  const handlers = {
    onClick: (e: any) => {
      e.stopPropagation();
      onSelect?.(product.id);
    },
    onPointerOver: (e: any) => {
      e.stopPropagation();
      document.body.style.cursor = "pointer";
    },
    onPointerOut: () => {
      document.body.style.cursor = "auto";
    }
  };

  // A rug is seen from above, so it lies flat at its measured size. It uses the
  // cut-out weave rather than the whole photo, or the shot's backdrop would
  // land on the floor as a white border around the rug.
  if (product.category === "rug") {
    return (
      <mesh position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, -yaw]} receiveShadow {...handlers}>
        <planeGeometry args={[product.width, product.depth]} />
        <meshBasicMaterial map={cutout.texture} color={tint} transparent alphaTest={0.35} />
      </mesh>
    );
  }

  // Framed pieces stay flat on their wall rather than turning to the camera.
  if (product.category === "art" || product.category === "mirror") {
    const hung = product.category === "art";
    const h = product.height;
    const w = Math.min(product.width, h * cutout.aspect);
    return (
      <mesh position={[x, hung ? hangCenterY(h) : h / 2, z]} rotation={[0, yaw, 0]} {...handlers}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={cutout.texture} color={tint} {...PHOTO_MATERIAL} />
      </mesh>
    );
  }

  // Fit the photo inside the measured box, then let it grow back toward the
  // real footprint. A listing photo is square-cropped and padded, so its
  // silhouette rarely matches the listed width-to-height ratio exactly; fitting
  // alone can leave a 6ft sofa drawn at 3ft. The stretch is capped so a piece
  // is never visibly deformed, and the floor shadow always carries the true
  // footprint whatever the photo does.
  const MAX_STRETCH = 1.25;
  const fitHeight = Math.min(product.height, product.width / cutout.aspect);
  const fitWidth = fitHeight * cutout.aspect;
  const width = fitWidth * Math.min(MAX_STRETCH, product.width / fitWidth);
  const height = fitHeight * Math.min(MAX_STRETCH, product.height / fitHeight);

  return (
    <group>
      <group ref={board} position={[x, 0, z]} {...handlers}>
        <mesh position={[0, height / 2, 0]}>
          <planeGeometry args={[width, height]} />
          <meshBasicMaterial map={cutout.texture} color={tint} {...PHOTO_MATERIAL} />
        </mesh>
      </group>
      {/* footprint shadow, kept on the real plan rotation */}
      <mesh position={[x, 0.025, z]} rotation={[-Math.PI / 2, 0, -yaw]}>
        <planeGeometry args={[product.width * 1.25, product.depth * 1.25]} />
        <meshBasicMaterial map={blob || undefined} transparent opacity={0.62} color="#000000" depthWrite={false} />
      </mesh>
      <Billboard target={board} x={x} z={z} yaw={yaw} free={isSymmetric(product)} />
    </group>
  );
}

/** How far a cutout may turn from the way the piece actually faces. */
const MAX_TURN = (52 * Math.PI) / 180;

/**
 * Pieces with no front. A round table, a plant, a floor lamp look the same from
 * every side, so holding them to an orientation only turns them edge-on and
 * thin. They may face the camera freely; nothing about the room is lost.
 */
function isSymmetric(product: Product) {
  if (product.category === "plant" || product.category === "lamp") return true;
  return product.category === "table" && Math.abs(product.width - product.depth) < 0.35;
}

/**
 * A cutout turns toward the camera, but only within an arc of the direction the
 * piece actually faces.
 *
 * Turning freely would keep the photo perfectly legible and destroy the thing
 * the layout just decided: a sofa facing the far wall would look like it faces
 * you from every angle, and the room would read as furniture scattered at
 * random. Clamping means walking around the room shows a piece turning away,
 * which is what tells you where its front is, while never letting it go so
 * edge-on that it thins to a line.
 */
function Billboard({ target, x, z, yaw, free }: { target: React.RefObject<THREE.Group>; x: number; z: number; yaw: number; free: boolean }) {
  useFrame(({ camera }) => {
    if (!target.current) return;
    const toCamera = Math.atan2(camera.position.x - x, camera.position.z - z);
    if (free) {
      target.current.rotation.y = toCamera;
      return;
    }
    let delta = toCamera - yaw;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    target.current.rotation.y = yaw + Math.max(-MAX_TURN, Math.min(MAX_TURN, delta));
  });
  return null;
}
