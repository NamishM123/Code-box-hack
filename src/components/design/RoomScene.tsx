"use client";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Environment } from "@react-three/drei";
import { useMemo } from "react";
import type { PlacedItem, Product, RoomSpec } from "@/lib/types";

interface Props {
  room: RoomSpec;
  products: Product[];
  placed: PlacedItem[];
}

export function RoomScene({ room, products, placed }: Props) {
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  return (
    <div className="card h-[520px] overflow-hidden">
      <div className="flex items-center justify-between p-3">
        <div className="text-xs uppercase tracking-widest text-black/50">3D view · drag to orbit</div>
        <div className="text-xs text-black/50">Scroll to zoom</div>
      </div>
      <div className="h-[460px] w-full">
        <Canvas shadows camera={{ position: [room.widthFt * 0.9, room.widthFt * 0.8, room.depthFt * 1.4], fov: 45 }}>
          <color attach="background" args={["#f6f1ea"]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[8, 12, 6]} intensity={1.1} castShadow />
          <Environment preset="apartment" />

          <group position={[-room.widthFt / 2, 0, -room.depthFt / 2]}>
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[room.widthFt / 2, 0, room.depthFt / 2]}>
              <planeGeometry args={[room.widthFt, room.depthFt]} />
              <meshStandardMaterial color="#e9e0d2" />
            </mesh>
            <mesh position={[room.widthFt / 2, 4, 0]}>
              <boxGeometry args={[room.widthFt, 8, 0.15]} />
              <meshStandardMaterial color="#f0ead9" />
            </mesh>
            <mesh position={[0, 4, room.depthFt / 2]}>
              <boxGeometry args={[0.15, 8, room.depthFt]} />
              <meshStandardMaterial color="#f0ead9" />
            </mesh>

            {placed.map((p) => {
              const prod = byId[p.productId];
              if (!prod) return null;
              const y = prod.height / 2;
              return (
                <mesh
                  key={p.productId}
                  position={[p.x, y, p.y]}
                  rotation={[0, (-p.rotation * Math.PI) / 180, 0]}
                  castShadow
                >
                  <boxGeometry args={[prod.width, prod.height, prod.depth]} />
                  <meshStandardMaterial color={prod.color} roughness={0.85} />
                </mesh>
              );
            })}

            <ContactShadows position={[room.widthFt / 2, 0.01, room.depthFt / 2]} opacity={0.35} blur={2.5} far={10} />
          </group>

          <OrbitControls enablePan minDistance={4} maxDistance={60} target={[0, 1, 0]} />
        </Canvas>
      </div>
    </div>
  );
}
