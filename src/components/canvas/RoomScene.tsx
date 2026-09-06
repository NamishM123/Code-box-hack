"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { useMemo } from "react";
import type { DetectedRoom, PlacedItem, Product, RoomSpec } from "@/lib/types";
import { StudioEnvironment } from "./furniture/StudioEnvironment";

interface Props {
  room: RoomSpec;
  detected?: DetectedRoom | null;
  products: Product[];
  placed: PlacedItem[];
  selectedId: string | null;
}

export function RoomScene({ room, detected, products, placed, selectedId }: Props) {
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

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
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[room.widthFt / 2, 0, room.depthFt / 2]}>
              <planeGeometry args={[room.widthFt, room.depthFt]} />
              <meshStandardMaterial color="#D9D3C7" />
            </mesh>
            <mesh position={[room.widthFt / 2, 4, 0]}>
              <boxGeometry args={[room.widthFt, 8, 0.15]} />
              <meshStandardMaterial color="#EFEAE0" />
            </mesh>
            <mesh position={[0, 4, room.depthFt / 2]}>
              <boxGeometry args={[0.15, 8, room.depthFt]} />
              <meshStandardMaterial color="#E6E0D5" />
            </mesh>

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
