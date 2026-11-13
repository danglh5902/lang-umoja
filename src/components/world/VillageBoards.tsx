"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { envState } from "@/lib/daytime";
import type { WorldData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import { formatDuration, formatShort, KIND_UNIT } from "@/lib/format";
import { makeBoardTexture, useFontsReady, type BoardRow } from "./signTextures";
import { terrainHeight } from "./Terrain";

/** Vị trí [x, z] và hướng xoay của 2 bảng giữa làng (dùng chung cho camera) */
export const BOARD_SPOTS = { honor: [-6.5, 8], villain: [6.5, 8] } as const;
export const BOARD_ROT = { honor: 0.45, villain: 0.2 } as const;

function Board({
  kind,
  texture,
  position,
  rotY,
}: {
  kind: "honor" | "villain";
  texture: THREE.Texture | null;
  position: [number, number, number];
  rotY: number;
}) {
  const setOpenBoard = useWorld((s) => s.setOpenBoard);
  const [hover, setHover] = useState(false);
  const faceMat = useRef<THREE.MeshStandardMaterial>(null);
  const lamp = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    const night = 1 - envState.daylight;
    // ban đêm: chữ trên bảng tự sáng + đèn lồng rọi vào bảng
    if (faceMat.current) faceMat.current.emissiveIntensity = 0.18 + night * 0.6;
    if (lamp.current) lamp.current.intensity = night * (9 + Math.sin(clock.elapsedTime * 6 + position[0]) * 0.8);
  });
  const W = 5.2;
  const H = 3.9;
  return (
    <group
      position={position}
      rotation={[0, rotY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        setOpenBoard(kind);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "default";
      }}
    >
      {/* cột gỗ */}
      {[-W / 2 + 0.25, W / 2 - 0.25].map((x) => (
        <mesh key={x} position={[x, 1.9, -0.12]} castShadow>
          <cylinderGeometry args={[0.13, 0.16, 3.8, 7]} />
          <meshStandardMaterial color="#4a3018" roughness={1} flatShading />
        </mesh>
      ))}
      {/* khung bảng */}
      <mesh position={[0, 3.25, -0.06]} castShadow>
        <boxGeometry args={[W + 0.3, H + 0.3, 0.14]} />
        <meshStandardMaterial
          color={kind === "honor" ? "#5a3a1c" : "#2a1510"}
          roughness={1}
          emissive={hover ? (kind === "honor" ? "#ffcc55" : "#ff3322") : "#000000"}
          emissiveIntensity={hover ? 0.35 : 0}
        />
      </mesh>
      {/* mặt bảng */}
      {texture && (
        <mesh position={[0, 3.25, 0.02]}>
          <planeGeometry args={[W, H]} />
          <meshStandardMaterial ref={faceMat} map={texture} roughness={0.9} emissiveMap={texture} emissive="#ffffff" emissiveIntensity={0.18} />
        </mesh>
      )}
      {/* mái che nhỏ */}
      <mesh position={[0, 5.45, 0.05]} rotation={[0.35, 0, 0]} castShadow>
        <boxGeometry args={[W + 0.8, 0.12, 0.9]} />
        <meshStandardMaterial color="#8f6c35" roughness={1} flatShading />
      </mesh>
      {/* đèn lồng treo dưới mái */}
      <mesh position={[0, 5.15, 0.55]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color="#ffd38a" emissive="#ffb24d" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <pointLight ref={lamp} position={[0, 5, 1.6]} color="#ffc27a" intensity={0} distance={9} decay={1.5} />
      {/* biểu tượng trên nóc */}
      <mesh position={[0, 5.85, 0]}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial
          color={kind === "honor" ? "#ffd166" : "#ff4b3e"}
          emissive={kind === "honor" ? "#ffb703" : "#ff2a1a"}
          emissiveIntensity={1.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function VillageBoards({ world }: { world: WorldData }) {
  const fontsReady = useFontsReady();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const honorTex = useMemo(() => {
    if (!fontsReady) return null;
    const rows: BoardRow[] = world.honor.map((h) => ({ left: h.name, right: formatShort(h.total, KIND_UNIT) }));
    return makeBoardTexture("honor", rows, "👆 Chạm vào bảng để xem từng người đã ủng hộ gì");
  }, [fontsReady, world.honor]);

  const villainTex = useMemo(() => {
    if (!fontsReady) return null;
    const now = Date.now();
    const standing = world.buildings
      .filter((b) => b.status === "STANDING")
      .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
    const fallen = world.buildings
      .filter((b) => b.status === "DESTROYED")
      .sort((a, b) => +new Date(b.destroyedAt ?? 0) - +new Date(a.destroyedAt ?? 0));
    const rows: BoardRow[] = [
      ...standing.map((b) => ({ left: b.name, right: `⏳ ${formatDuration(now - +new Date(b.createdAt))}` })),
      ...fallen.map((b) => ({
        left: b.name,
        right: `sống ${formatDuration(+new Date(b.destroyedAt ?? now) - +new Date(b.createdAt))}`,
        dim: true,
      })),
    ];
    return makeBoardTexture("villain", rows, `Còn ${standing.length} tòa đang đứng · chạm để xem tất cả`);
    // tick: vẽ lại mỗi phút để cập nhật thời gian tồn tại
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontsReady, world.buildings, tick]);

  // giải phóng texture cũ
  useEffect(() => () => honorTex?.dispose(), [honorTex]);
  useEffect(() => () => villainTex?.dispose(), [villainTex]);

  const [hx, hz] = BOARD_SPOTS.honor;
  const [vx, vz] = BOARD_SPOTS.villain;
  return (
    <group>
      <Board kind="honor" texture={honorTex} position={[hx, terrainHeight(hx, hz), hz]} rotY={BOARD_ROT.honor} />
      <Board kind="villain" texture={villainTex} position={[vx, terrainHeight(vx, vz), vz]} rotY={BOARD_ROT.villain} />
    </group>
  );
}
