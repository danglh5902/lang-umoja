"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { VILLAGE_CENTER, gridToWorld, type BuildingData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import { makeBuildingTexture, hash2 } from "./textures";
import { terrainHeight } from "./Terrain";
import { anchorRef } from "../labels/labelBus";
import { makeBuildingSignTexture, useFontsReady } from "./signTextures";
import { envState } from "@/lib/daytime";
import { playBuild } from "@/lib/sfx";

const COLLAPSE_MS = 3000;

function buildingHeight(goal: number) {
  return 4 + Math.min(10, goal / 30000);
}

function slugSeed(slug: string) {
  return [...slug].reduce((a, c) => a + c.charCodeAt(0), 0);
}

/** Khói ô nhiễm — to, chậm, nâu xám */
function Smoke({ height, offset = 0 }: { height: number; offset?: number }) {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        offset: i * 0.6 + offset,
        drift: (i % 2 === 0 ? 1 : -1) * (0.3 + (i % 3) * 0.2),
      })),
    [offset]
  );
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.children.forEach((puff, i) => {
      const p = puffs[i];
      const phase = (t * 0.28 + p.offset) % 4;
      puff.position.set(
        Math.sin(phase * 1.6 + i) * 0.5 + p.drift * phase * 1.4,
        height + phase * 2.4,
        Math.cos(phase * 1.2 + i) * 0.4
      );
      puff.scale.setScalar(0.5 + phase * 0.9);
      const mat = (puff as THREE.Mesh).material as THREE.MeshStandardMaterial;
      mat.opacity = Math.max(0, 0.42 - phase * 0.105);
    });
  });
  return (
    <group ref={group}>
      {puffs.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.7, 7, 7]} />
          <meshStandardMaterial color="#6b655c" transparent opacity={0.35} depthWrite={false} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** Cây hữu cơ — thân cong nhẹ + tán lá là các khối cầu lệch, flat shading */
export function Tree({ grownAt, seed = 1, scale = 1 }: { grownAt: number; seed?: number; scale?: number }) {
  const group = useRef<THREE.Group>(null);
  const blobs = useMemo(() => {
    const n = 3 + Math.floor(hash2(seed, 1) * 3);
    return Array.from({ length: n }, (_, i) => ({
      pos: [
        (hash2(seed, i + 2) - 0.5) * 2.2,
        3 + hash2(seed, i + 7) * 2.2,
        (hash2(seed, i + 12) - 0.5) * 2.2,
      ] as [number, number, number],
      r: 1.1 + hash2(seed, i + 20) * 1.1,
      shade: hash2(seed, i + 30),
    }));
  }, [seed]);
  const lean = useMemo(() => (hash2(seed, 99) - 0.5) * 0.18, [seed]);

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = grownAt === 0 ? 1 : Math.min(1, (Date.now() - grownAt) / 2500);
    const ease = 1 - Math.pow(1 - t, 3);
    g.scale.setScalar(Math.max(0.001, ease * scale));
    g.rotation.z = lean + Math.sin(clock.elapsedTime * 1.1 + seed) * 0.015;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 1.6, 0]} rotation={[0, 0, lean]} castShadow>
        <cylinderGeometry args={[0.22, 0.45, 3.4, 7]} />
        <meshStandardMaterial color="#5e4426" roughness={1} flatShading />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.pos} castShadow>
          <icosahedronGeometry args={[b.r, 1]} />
          <meshStandardMaterial
            color={new THREE.Color("#3f8f3f").offsetHSL(0.02 * b.shade, 0.05, b.shade * 0.1 - 0.02)}
            roughness={0.95}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

/** Đống đổ nát: khối bê tông vỡ + sắt thép lòi ra */
function Rubble({ seed }: { seed: number }) {
  const rocks = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        x: Math.cos((i / 9) * Math.PI * 2 + seed) * (1 + hash2(seed, i) * 1.6),
        z: Math.sin((i / 9) * Math.PI * 2 + seed) * (1 + hash2(seed, i + 9) * 1.6),
        s: 0.25 + hash2(seed, i + 18) * 0.5,
        r: hash2(seed, i + 27) * Math.PI,
      })),
    [seed]
  );
  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.s / 2, r.z]} rotation={[r.r, r.r * 1.3, r.r * 0.6]} castShadow>
          <boxGeometry args={[r.s, r.s * 0.8, r.s]} />
          <meshStandardMaterial color="#7a7a78" roughness={1} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh
          key={`rebar-${i}`}
          position={[hash2(seed, i + 40) * 2 - 1, 0.5, hash2(seed, i + 50) * 2 - 1]}
          rotation={[(hash2(seed, i + 60) - 0.5) * 0.9, 0, (hash2(seed, i + 70) - 0.5) * 0.9]}
        >
          <cylinderGeometry args={[0.03, 0.03, 1.2, 4]} />
          <meshStandardMaterial color="#5a3d2e" roughness={0.8} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

export default function BuildingMesh({ building }: { building: BuildingData }) {
  const [x, z] = gridToWorld(building.gridX, building.gridY);
  const groundY = terrainHeight(x, z);
  // mặt tiền + biển hiệu quay về phía làng
  const [vx, vz] = gridToWorld(VILLAGE_CENTER[0], VILLAGE_CENTER[1]);
  const facing = Math.atan2(vx - x, vz - z);
  const selectBuilding = useWorld((s) => s.selectBuilding);
  const selected = useWorld((s) => s.selectedBuildingId === building.id);
  const collapseStart = useWorld((s) => s.collapsing[building.id]);
  const hovered = useWorld((s) => s.hoveredBuildingId === building.id);
  const setHovered = useWorld((s) => s.setHoveredBuilding);
  const bodyRef = useRef<THREE.Group>(null);
  const riseRef = useRef<THREE.Group>(null);
  const fontsReady = useFontsReady();
  // tòa vừa được kẻ xấu dựng → trồi lên từ lòng đất
  const riseStart = useRef<number | null>(null);
  useEffect(() => {
    const age = Date.now() - new Date(building.createdAt).getTime();
    if (age < 20000) {
      riseStart.current = Date.now();
      playBuild();
    }
  }, [building.createdAt]);

  const seed = useMemo(() => slugSeed(building.slug), [building.slug]);
  const h = buildingHeight(building.goalAmount);
  const progress = Math.min(1, building.raisedAmount / building.goalAmount);
  const variant = seed % 3; // 0: tháp đơn, 1: tháp + đế, 2: tháp + bồn làm mát
  const floors = Math.max(4, Math.round(h * 1.1));

  const tints = ["#8d9196", "#9a938a", "#848b90", "#938d95"];
  const tint = tints[seed % tints.length];

  // texture mặt tiền (client-only)
  const materials = useMemo(() => {
    const { map, emissiveMap } = makeBuildingTexture(seed, floors, tint);
    const side = new THREE.MeshStandardMaterial({
      map,
      emissiveMap,
      emissive: new THREE.Color("#ffffff"),
      emissiveIntensity: 1.1,
      roughness: 0.85,
    });
    const roof = new THREE.MeshStandardMaterial({ color: "#55575c", roughness: 1 });
    return [side, side, roof, roof, side, side];
  }, [seed, floors, tint]);

  // biển hiệu trước cổng: tên tòa nhà + kẻ đã dựng
  const signTex = useMemo(() => {
    if (!fontsReady) return null;
    const villain = building.source === "COMMUNITY";
    const sub = villain
      ? `Kẻ dựng: ${building.contributorName ?? "Kẻ Giấu Mặt"}`
      : `“${building.slogan}”`;
    return makeBuildingSignTexture(building.name, sub, villain);
  }, [fontsReady, building.name, building.slogan, building.source, building.contributorName]);

  useFrame(({ clock }) => {
    // cửa sổ sáng rực hơn khi trời tối
    const night = 1 - envState.daylight;
    const side = materials[0];
    side.emissiveIntensity = 0.9 + night * 1.9 + (night > 0.5 ? Math.sin(clock.elapsedTime * 0.7 + seed) * 0.1 : 0);

    const r = riseRef.current;
    if (r && riseStart.current) {
      const t = Math.min(1, (Date.now() - riseStart.current) / 3200);
      const ease = 1 - Math.pow(1 - t, 3);
      r.scale.set(1, Math.max(0.001, ease), 1);
      r.position.x = t < 1 ? Math.sin(t * 80) * 0.08 : 0;
      if (t >= 1) riseStart.current = null;
    }

    const g = bodyRef.current;
    if (!g || !collapseStart) return;
    const t = Math.min(1, (Date.now() - collapseStart) / COLLAPSE_MS);
    const shake = Math.sin(t * 60) * 0.14 * (1 - t);
    g.position.x = shake;
    g.position.y = -h * t * t * 0.95;
    g.rotation.z = t * t * 0.5;
    g.scale.setScalar(1 - t * 0.3);
  });

  const isDestroyed = building.status === "DESTROYED";
  const collapsing = Boolean(collapseStart) && Date.now() - (collapseStart ?? 0) < COLLAPSE_MS;

  if (isDestroyed && !collapsing) {
    const grownAt = collapseStart ? collapseStart + COLLAPSE_MS : 0;
    return (
      <group position={[x, groundY, z]}>
        <Rubble seed={seed} />
        <Tree grownAt={grownAt} seed={seed} scale={1.3} />
      </group>
    );
  }

  const towerW = variant === 1 ? 3 : 3.6;

  return (
    <group position={[x, groundY, z]}>
      <group ref={riseRef}>
      <group
        ref={bodyRef}
        onClick={(e) => {
          e.stopPropagation();
          selectBuilding(building.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(building.id);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = "default";
        }}
      >
        {/* nền bê tông */}
        <mesh position={[0, 0.12, 0]} receiveShadow>
          <cylinderGeometry args={[4.2, 4.6, 0.3, 24]} />
          <meshStandardMaterial color="#6f6f6c" roughness={1} />
        </mesh>

        {/* đế podium (variant 1) */}
        {variant === 1 && (
          <mesh position={[0, h * 0.18, 0]} castShadow material={materials}>
            <boxGeometry args={[5, h * 0.36, 4.4]} />
          </mesh>
        )}

        {/* tháp chính */}
        <mesh position={[0, h / 2 + (variant === 1 ? h * 0.1 : 0), 0]} castShadow material={materials}>
          <boxGeometry args={[towerW, h, towerW]} />
        </mesh>

        {/* bồn làm mát (variant 2) */}
        {variant === 2 && (
          <group position={[3.1, 0, 0.6]}>
            <mesh position={[0, h * 0.28, 0]} castShadow>
              <cylinderGeometry args={[1.1, 1.5, h * 0.56, 14]} />
              <meshStandardMaterial color="#9aa0a4" roughness={0.9} />
            </mesh>
            <Smoke height={h * 0.56} offset={1.7} />
          </group>
        )}

        {/* viền phát sáng khi hover/chọn */}
        {(hovered || selected) && (
          <mesh position={[0, h / 2 + (variant === 1 ? h * 0.1 : 0), 0]}>
            <boxGeometry args={[towerW + 0.15, h + 0.15, towerW + 0.15]} />
            <meshBasicMaterial color="#ff6a3c" transparent opacity={0.18} toneMapped={false} />
          </mesh>
        )}

        {/* nóc: máy lạnh, ăng-ten, chảo vệ tinh, ống khói */}
        <group position={[0, h + (variant === 1 ? h * 0.1 : 0), 0]}>
          <mesh position={[-towerW * 0.25, 0.3, towerW * 0.2]} castShadow>
            <boxGeometry args={[0.9, 0.6, 0.7]} />
            <meshStandardMaterial color="#b9bcc0" roughness={0.8} />
          </mesh>
          <mesh position={[towerW * 0.25, 0.25, -towerW * 0.22]} castShadow>
            <boxGeometry args={[0.7, 0.5, 0.6]} />
            <meshStandardMaterial color="#a7abb0" roughness={0.8} />
          </mesh>
          <mesh position={[towerW * 0.3, 1, towerW * 0.28]}>
            <cylinderGeometry args={[0.025, 0.025, 2, 5]} />
            <meshStandardMaterial color="#3a3a3a" />
          </mesh>
          <mesh position={[towerW * 0.3, 2, towerW * 0.28]}>
            <sphereGeometry args={[0.07, 6, 6]} />
            <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={2.5} toneMapped={false} />
          </mesh>
          {/* chảo vệ tinh */}
          <group position={[-towerW * 0.28, 0.75, -towerW * 0.2]} rotation={[0.9, seed % 6, 0]}>
            <mesh>
              <sphereGeometry args={[0.55, 10, 6, 0, Math.PI * 2, 0, Math.PI / 3]} />
              <meshStandardMaterial color="#d7dadd" roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
          </group>
          {/* ống khói */}
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.42, 1.8, 10]} />
            <meshStandardMaterial color="#5c5f63" roughness={1} />
          </mesh>
        </group>
        <group position={[0, variant === 1 ? h * 0.1 : 0, 0]}>
          <Smoke height={h + 1.6} />
        </group>

        {/* ống dẫn bên hông */}
        <mesh position={[towerW / 2 + 0.08, h * 0.45, -towerW * 0.3]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, h * 0.9, 6]} />
          <meshStandardMaterial color="#6e6256" roughness={0.9} metalness={0.3} />
        </mesh>

        {/* điểm neo cho nhãn DOM phía trên nóc */}
        <object3D ref={anchorRef(`b:${building.id}`)} position={[0, h + 3.2 + (variant === 1 ? h * 0.1 : 0), 0]} />
      </group>
      </group>

      {/* biển hiệu trước cổng — tên tòa nhà do người dựng đặt, quay về phía làng */}
      <group rotation={[0, facing, 0]}>
      <group
        position={[0, 0, 5.6]}
        onClick={(e) => {
          e.stopPropagation();
          selectBuilding(building.id);
        }}
      >
        {[-1.9, 1.9].map((px) => (
          <mesh key={px} position={[px, 1.1, -0.05]} castShadow>
            <cylinderGeometry args={[0.08, 0.1, 2.2, 6]} />
            <meshStandardMaterial color="#3d3f44" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 1.75, -0.08]} castShadow>
          <boxGeometry args={[4.6, 1.55, 0.1]} />
          <meshStandardMaterial color="#26272c" roughness={0.7} metalness={0.4} />
        </mesh>
        {signTex && (
          <mesh position={[0, 1.75, -0.02]}>
            <planeGeometry args={[4.4, 1.375]} />
            <meshStandardMaterial
              map={signTex}
              emissiveMap={signTex}
              emissive="#ffffff"
              emissiveIntensity={0.55}
              roughness={0.5}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
      </group>

      {/* vòng tiến độ phá dỡ */}
      <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.3, 4.65, 40, 1, 0, Math.PI * 2 * Math.max(0.02, progress)]} />
        <meshBasicMaterial color="#ffb703" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
