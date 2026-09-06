"use client";
import { Environment, Lightformer } from "@react-three/drei";

/**
 * A four-panel studio environment built in the scene instead of loaded as an
 * HDR from a CDN. drei's `preset` environments suspend on a network fetch, and
 * when that fetch fails the throw escapes the canvas and takes the whole page
 * down with it. Building the lightformers locally keeps reflections working on
 * a blocked or flaky network, which is also the case where a shopper is most
 * likely to be on a phone.
 */
export function StudioEnvironment({ warm = false }: { warm?: boolean }) {
  return (
    <Environment resolution={192} frames={1}>
      <color attach="background" args={[warm ? "#17161A" : "#3A3D42"]} />
      <Lightformer form="rect" intensity={warm ? 0.5 : 2.4} color="#FFF6E8" position={[0, 5, -9]} scale={[14, 7, 1]} />
      <Lightformer form="rect" intensity={warm ? 0.8 : 1.3} color="#FFE2BC" position={[-8, 4, 4]} scale={[8, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
      <Lightformer form="rect" intensity={warm ? 0.4 : 1.1} color="#DCE9F5" position={[8, 4, 4]} scale={[8, 6, 1]} rotation={[0, -Math.PI / 2, 0]} />
      <Lightformer form="circle" intensity={warm ? 0.6 : 2} color="#FFFFFF" position={[0, 9, 0]} scale={9} rotation={[Math.PI / 2, 0, 0]} />
    </Environment>
  );
}
