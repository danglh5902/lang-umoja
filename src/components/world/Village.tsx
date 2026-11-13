"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GRID_SIZE, TILE, VILLAGE_CENTER, gridToWorld, type WorldData } from "@/lib/world-types";
import { hash2 } from "./textures";
import { terrainHeight, greennessAt } from "./Terrain";
import { Tree } from "./BuildingMesh";
import VillageBoards from "./VillageBoards";
import { envState } from "@/lib/daytime";

/** Chòi mái rạ nhiều lớp */
function Hut({ position, seed }: { position: [number, number, number]; seed: number }) {
  const rot = hash2(seed, 1) * Math.PI * 2;
  return (
    <group position={position} rotation={[0, rot, 0]}>
      {/* tường đất */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[1.25, 1.35, 1.6, 12]} />
        <meshStandardMaterial color="#b78f61" roughness={1} flatShading />
      </mesh>
      {/* mái rạ 3 lớp */}
      <mesh position={[0, 2.05, 0]} castShadow>
        <coneGeometry args={[1.85, 1.1, 12]} />
        <meshStandardMaterial color="#8f6c35" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[1.35, 0.9, 12]} />
        <meshStandardMaterial color="#9d783c" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 3.1, 0]} castShadow>
        <coneGeometry args={[0.8, 0.8, 10]} />
        <meshStandardMaterial color="#aa8443" roughness={1} flatShading />
      </mesh>
      {/* cửa gỗ */}
      <mesh position={[0, 0.55, 1.28]}>
        <boxGeometry args={[0.6, 1.05, 0.08]} />
        <meshStandardMaterial color="#4a3316" roughness={1} />
      </mesh>
      {/* bậc đá */}
      <mesh position={[0, 0.06, 1.6]}>
        <boxGeometry args={[0.8, 0.12, 0.5]} />
        <meshStandardMaterial color="#8a8578" roughness={1} />
      </mesh>
    </group>
  );
}

function Well({ position, hasWater }: { position: [number, number, number]; hasWater: boolean }) {
  const waterRef = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    const m = waterRef.current;
    if (!m) return;
    const target = hasWater ? 1 : 0;
    m.opacity += (target * 0.95 - m.opacity) * 0.01;
    m.emissiveIntensity = hasWater ? 0.25 + Math.sin(clock.elapsedTime * 2) * 0.1 : 0;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.95, 1.05, 0.9, 14]} />
        <meshStandardMaterial color="#95897b" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.91, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 0.06, 14]} />
        <meshStandardMaterial color="#2f2620" roughness={1} />
      </mesh>
      <mesh position={[0, 0.94, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.04, 14]} />
        <meshStandardMaterial
          ref={waterRef}
          color="#2f9ddb"
          emissive="#1d6fa3"
          transparent
          opacity={0}
          roughness={0.1}
        />
      </mesh>
      {[-0.75, 0.75].map((x) => (
        <mesh key={x} position={[x, 1.35, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 1.7, 6]} />
          <meshStandardMaterial color="#5e4426" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 2.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.95, 0.55, 4]} />
        <meshStandardMaterial color="#8f6c35" roughness={1} flatShading />
      </mesh>
      {/* gàu nước */}
      <mesh position={[0.2, 1.5, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.16, 8]} />
        <meshStandardMaterial color="#6e5636" roughness={1} />
      </mesh>
    </group>
  );
}

/** Lửa trại bập bùng + ánh sáng nhấp nháy */
function Campfire({ position }: { position: [number, number, number] }) {
  const light = useRef<THREE.PointLight>(null);
  const flame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const night = 1 - envState.daylight;
    if (light.current) light.current.intensity = (8 + night * 34) * (1 + Math.sin(t * 9) * 0.18 + Math.sin(t * 23) * 0.1);
    if (flame.current) {
      flame.current.scale.set(1 + Math.sin(t * 11) * 0.12, 1 + Math.sin(t * 7) * 0.2, 1 + Math.cos(t * 9) * 0.12);
    }
  });
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.1, 0]} rotation={[0.25, (i * Math.PI * 2) / 3, 1.35]}>
          <cylinderGeometry args={[0.07, 0.09, 1.1, 6]} />
          <meshStandardMaterial color="#4a3316" roughness={1} />
        </mesh>
      ))}
      <mesh ref={flame} position={[0, 0.5, 0]}>
        <coneGeometry args={[0.28, 0.9, 7]} />
        <meshStandardMaterial color="#ff9b3d" emissive="#ff6a00" emissiveIntensity={2.4} toneMapped={false} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <coneGeometry args={[0.16, 0.5, 6]} />
        <meshStandardMaterial color="#ffe08a" emissive="#ffc24d" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight ref={light} position={[0, 1.2, 0]} color="#ff9b4d" intensity={14} distance={26} decay={1.6} castShadow={false} />
    </group>
  );
}

/** Hàng rào gỗ ngắn */
function Fence({ position, length, rotY }: { position: [number, number, number]; length: number; rotY: number }) {
  const posts = Math.floor(length / 0.9);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {Array.from({ length: posts }, (_, i) => (
        <mesh key={i} position={[i * 0.9 - length / 2, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.85, 5]} />
          <meshStandardMaterial color="#6e5636" roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]}>
        <boxGeometry args={[length, 0.06, 0.05]} />
        <meshStandardMaterial color="#7d6240" roughness={1} />
      </mesh>
    </group>
  );
}

/** Cây khô rải khắp map — hồi sinh (mọc lá) khi đất quanh nó xanh lại */
function WildTrees({ world }: { world: WorldData }) {
  const trees = useMemo(() => {
    const arr: { x: number; z: number; seed: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const x = (hash2(i + 200, 1) - 0.5) * GRID_SIZE * TILE * 0.95;
      const z = (hash2(i + 200, 2) - 0.5) * GRID_SIZE * TILE * 0.95;
      // tránh giữa làng
      const [vx, vz] = gridToWorld(VILLAGE_CENTER[0], VILLAGE_CENTER[1]);
      if (Math.hypot(x - vx, z - vz) < 14) continue;
      arr.push({ x, z, seed: i + 200 });
    }
    return arr;
  }, []);

  return (
    <group>
      {trees.map((t) => {
        const g = greennessAt(t.x, t.z, world);
        const alive = g > 0.45;
        const y = terrainHeight(t.x, t.z);
        return (
          <group key={t.seed} position={[t.x, y, t.z]}>
            {alive ? (
              <Tree grownAt={0} seed={t.seed} scale={0.8 + hash2(t.seed, 5) * 0.5} />
            ) : (
              // cây khô trụi lá
              <group rotation={[0, hash2(t.seed, 3) * Math.PI, (hash2(t.seed, 4) - 0.5) * 0.25]}>
                <mesh position={[0, 1.1, 0]} castShadow>
                  <cylinderGeometry args={[0.1, 0.22, 2.2, 6]} />
                  <meshStandardMaterial color="#4e4034" roughness={1} flatShading />
                </mesh>
                <mesh position={[0.35, 2, 0]} rotation={[0, 0, -0.7]}>
                  <cylinderGeometry args={[0.04, 0.08, 1.1, 5]} />
                  <meshStandardMaterial color="#4e4034" roughness={1} flatShading />
                </mesh>
                <mesh position={[-0.3, 2.2, 0.1]} rotation={[0.2, 0, 0.6]}>
                  <cylinderGeometry args={[0.03, 0.07, 0.95, 5]} />
                  <meshStandardMaterial color="#4e4034" roughness={1} flatShading />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function Village({ world }: { world: WorldData }) {
  const phase = world.phase;
  const hutSpots: [number, number][] = [
    [15, 16.2],
    [20.2, 16],
    [14.5, 19.8],
    [20, 20.3],
    [17.5, 21.5],
  ];
  const [wx, wz] = gridToWorld(VILLAGE_CENTER[0], VILLAGE_CENTER[1]);
  const [fx, fz] = gridToWorld(16.6, 17.2);

  return (
    <group>
      {hutSpots.map(([gx, gy], i) => {
        const [x, z] = gridToWorld(gx, gy);
        return <Hut key={i} position={[x, terrainHeight(x, z), z]} seed={i + 11} />;
      })}
      <Well position={[wx, terrainHeight(wx, wz), wz]} hasWater={phase >= 3} />
      <Campfire position={[fx, terrainHeight(fx, fz), fz]} />
      <Fence position={[wx - 6, terrainHeight(wx - 6, wz + 7), wz + 7]} length={7} rotY={0.4} />
      <Fence position={[wx + 7, terrainHeight(wx + 7, wz - 5), wz - 5]} length={6} rotY={-0.9} />
      <WildTrees world={world} />
      <VillageBoards world={world} />
    </group>
  );
}
