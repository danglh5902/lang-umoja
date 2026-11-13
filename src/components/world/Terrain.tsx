"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { GRID_SIZE, TILE, VILLAGE_CENTER, gridToWorld, type WorldData } from "@/lib/world-types";
import { fbm2, hash2 } from "./textures";

const WORLD_HALF = (GRID_SIZE * TILE) / 2; // 72
const PLANE = GRID_SIZE * TILE + 80; // mép đồi bao quanh
const SEG = 110;

const DRY_A = new THREE.Color("#a8835a");
const DRY_B = new THREE.Color("#7d5e38");
const GREEN_A = new THREE.Color("#5a9b43");
const GREEN_B = new THREE.Color("#3e7a30");

/** Độ hồi sinh 0..1 tại một điểm thế giới — lan từ các tòa đã phá + làng + phase */
export function greennessAt(wx: number, wz: number, world: WorldData): number {
  if (world.phase >= 4) return 1;
  let g = 0;
  for (const b of world.buildings) {
    if (b.status !== "DESTROYED") continue;
    const [bx, bz] = gridToWorld(b.gridX, b.gridY);
    const d = Math.hypot(wx - bx, wz - bz);
    g = Math.max(g, 1 - d / (TILE * 4.5));
  }
  const [vx, vz] = gridToWorld(VILLAGE_CENTER[0], VILLAGE_CENTER[1]);
  const dv = Math.hypot(wx - vx, wz - vz);
  g = Math.max(g, 0.45 - dv / 55);
  g = Math.max(g, (world.phase - 1) * 0.14);
  return Math.min(1, Math.max(0, g));
}

/** Độ cao địa hình (tĩnh): trung tâm phẳng, rìa map nhô đồi */
export function terrainHeight(wx: number, wz: number): number {
  const d = Math.hypot(wx, wz);
  const edge = Math.max(0, (d - WORLD_HALF + 18) / 40);
  const hills = fbm2(wx * 0.025 + 7, wz * 0.025 + 3) * 14 * edge * edge;
  const bumps = fbm2(wx * 0.12, wz * 0.12) * 0.45;
  return hills + bumps;
}

function Ground({ world }: { world: WorldData }) {
  const geomRef = useRef<THREE.PlaneGeometry>(null);
  const colorsRef = useRef<Float32Array | null>(null);

  // vị trí đỉnh (tĩnh) — dựng 1 lần
  const setup = useMemo(() => {
    const geom = new THREE.PlaneGeometry(PLANE, PLANE, SEG, SEG);
    geom.rotateX(-Math.PI / 2);
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
    }
    geom.computeVertexNormals();
    const colors = new Float32Array(pos.count * 3);
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return geom;
  }, []);

  // màu mục tiêu theo trạng thái thế giới
  const targets = useMemo(() => {
    const pos = setup.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const g = greennessAt(x, z, world);
      const n = fbm2(x * 0.08 + 31, z * 0.08 + 11);
      const dry = DRY_A.clone().lerp(DRY_B, n);
      // vết nứt đất khô: chấm tối ngẫu nhiên
      if (hash2(Math.round(x * 2), Math.round(z * 2)) > 0.93) dry.multiplyScalar(0.75);
      const green = GREEN_A.clone().lerp(GREEN_B, fbm2(x * 0.15 + 5, z * 0.15));
      c.copy(dry).lerp(green, g);
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [setup, world]);

  useFrame(() => {
    const geom = geomRef.current ?? setup;
    const attr = geom.attributes.color as THREE.BufferAttribute;
    const colors = attr.array as Float32Array;
    if (!colorsRef.current) {
      colors.set(targets);
      colorsRef.current = colors;
      attr.needsUpdate = true;
      return;
    }
    let dirty = false;
    for (let i = 0; i < colors.length; i++) {
      const diff = targets[i] - colors[i];
      if (Math.abs(diff) > 0.002) {
        colors[i] += diff * 0.02;
        dirty = true;
      }
    }
    if (dirty) attr.needsUpdate = true;
  });

  return (
    <mesh geometry={setup} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}

/** Cỏ mọc dần ở vùng đất hồi sinh */
function Grass({ world }: { world: WorldData }) {
  const COUNT = 1400;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const current = useRef(new Float32Array(COUNT));

  const spots = useMemo(() => {
    const arr: { x: number; z: number; rot: number; s: number }[] = [];
    for (let i = 0; i < COUNT; i++) {
      const x = (hash2(i, 1) - 0.5) * GRID_SIZE * TILE;
      const z = (hash2(i, 2) - 0.5) * GRID_SIZE * TILE;
      arr.push({ x, z, rot: hash2(i, 3) * Math.PI, s: 0.6 + hash2(i, 4) * 0.9 });
    }
    return arr;
  }, []);

  const targets = useMemo(() => {
    const t = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      const g = greennessAt(spots[i].x, spots[i].z, world);
      t[i] = g > 0.3 ? g : 0;
    }
    return t;
  }, [spots, world]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorSet = useRef(false);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    let dirty = false;
    for (let i = 0; i < COUNT; i++) {
      const cur = current.current[i];
      const tgt = targets[i];
      if (Math.abs(cur - tgt) > 0.01 || !colorSet.current) {
        current.current[i] = cur + (tgt - cur) * 0.03;
        dirty = true;
      }
      if (dirty || !colorSet.current) {
        const sp = spots[i];
        const s = Math.max(0.0001, current.current[i] * sp.s);
        dummy.position.set(sp.x, terrainHeight(sp.x, sp.z), sp.z);
        dummy.rotation.set(0, sp.rot, 0);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
    }
    if (!colorSet.current) {
      const c = new THREE.Color();
      for (let i = 0; i < COUNT; i++) {
        c.set("#5fae45").offsetHSL(0, 0, (hash2(i, 9) - 0.5) * 0.12);
        mesh.setColorAt(i, c);
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      colorSet.current = true;
      dirty = true;
    }
    if (dirty) mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <coneGeometry args={[0.22, 0.9, 5]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}

/** Đá rải rác */
function Rocks() {
  const COUNT = 60;
  const items = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const x = (hash2(i + 50, 1) - 0.5) * (GRID_SIZE * TILE + 30);
        const z = (hash2(i + 50, 2) - 0.5) * (GRID_SIZE * TILE + 30);
        return {
          pos: [x, terrainHeight(x, z) + 0.1, z] as [number, number, number],
          s: 0.3 + hash2(i + 50, 3) * 1.4,
          rot: hash2(i + 50, 4) * Math.PI * 2,
          shade: 0.45 + hash2(i + 50, 5) * 0.25,
        };
      }),
    []
  );
  return (
    <group>
      {items.map((r, i) => (
        <mesh key={i} position={r.pos} rotation={[r.rot, r.rot * 1.7, 0]} scale={r.s} castShadow>
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial color={new THREE.Color(r.shade, r.shade * 0.95, r.shade * 0.85)} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** Dòng suối — trơ đáy ở Hồi I–II, nước chảy về từ Hồi III */
function River({ phase }: { phase: number }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const geom = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = -WORLD_HALF - 20 + t * (WORLD_HALF * 2 + 40);
      const z = Math.sin(t * Math.PI * 2.2 + 1.3) * 22 - 28;
      pts.push(new THREE.Vector3(x, 0, z));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 80, 2.2, 8, false);
    g.scale(1, 0.08, 1);
    return g;
  }, []);

  useFrame(({ clock }) => {
    const m = matRef.current;
    if (!m) return;
    const target = phase >= 3 ? 0.88 : 0;
    m.opacity += (target - m.opacity) * 0.01;
    m.visible = m.opacity > 0.02;
    // lấp lánh nhẹ
    m.emissiveIntensity = 0.15 + Math.sin(clock.elapsedTime * 1.5) * 0.08;
  });

  return (
    <group>
      {/* lòng suối khô */}
      <mesh geometry={geom} position={[0, 0.1, 0]} scale={[1, 0.5, 1.25]}>
        <meshStandardMaterial color="#6e5636" roughness={1} />
      </mesh>
      {/* nước */}
      <mesh geometry={geom} position={[0, 0.32, 0]}>
        <meshStandardMaterial
          ref={matRef}
          color="#3f9fd9"
          emissive="#1d6fa3"
          emissiveIntensity={0.2}
          transparent
          opacity={0}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

export default function Terrain({ world }: { world: WorldData }) {
  return (
    <group>
      <Ground world={world} />
      <Grass world={world} />
      <Rocks />
      <River phase={world.phase} />
    </group>
  );
}
