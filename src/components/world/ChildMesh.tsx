"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { gridToWorld, type ChildData } from "@/lib/world-types";
import { useWorld } from "@/store/world";
import { terrainHeight } from "./Terrain";
import { anchorRef } from "../labels/labelBus";

const SHIRT_COLORS = ["#e76f51", "#2a9d8f", "#e9c46a", "#f4a261", "#9b5de5", "#00b4d8", "#ef476f", "#06d6a0"];
const SKIN_TONES = ["#6b4226", "#593420", "#7a4e2d", "#4e2f1a"];
const PANT_COLORS = ["#3a4660", "#5c4433", "#444444", "#6e3b3b"];

export default function ChildMesh({ child }: { child: ChildData }) {
  const [hx, hz] = gridToWorld(child.gridX, child.gridY);
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Group>(null);
  const rightLeg = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const selectChild = useWorld((s) => s.selectChild);
  const selected = useWorld((s) => s.selectedChildId === child.id);
  const celebrateAt = useWorld((s) => s.celebrating[child.id]);
  const hovered = useWorld((s) => s.hoveredChildId === child.id);
  const setHovered = useWorld((s) => s.setHoveredChild);

  const look = useMemo(() => {
    const hash = [...child.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    return {
      shirt: SHIRT_COLORS[hash % SHIRT_COLORS.length],
      skin: SKIN_TONES[hash % SKIN_TONES.length],
      pants: PANT_COLORS[(hash >> 2) % PANT_COLORS.length],
    };
  }, [child.id]);

  const walk = useRef({ x: hx, z: hz, tx: hx, tz: hz, nextPick: 0, blend: 0 });
  const scale = 0.75 + child.growthStage * 0.18;
  const sad = child.hunger < 25 || child.thirst < 25;

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const w = walk.current;
    const t = clock.elapsedTime;

    if (t > w.nextPick) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 5;
      w.tx = hx + Math.cos(angle) * radius;
      w.tz = hz + Math.sin(angle) * radius;
      w.nextPick = t + 3 + Math.random() * 5;
    }
    const speed = sad ? 0.006 : 0.016;
    w.x += (w.tx - w.x) * speed;
    w.z += (w.tz - w.z) * speed;

    const moving = Math.hypot(w.tx - w.x, w.tz - w.z) > 0.2;
    w.blend += ((moving ? 1 : 0) - w.blend) * 0.08;

    let bounce = Math.abs(Math.sin(t * 7)) * 0.06 * w.blend;
    let celebrate = 0;
    if (celebrateAt && Date.now() - celebrateAt < 2200) {
      celebrate = Math.abs(Math.sin((Date.now() - celebrateAt) / 90)) * 0.55;
      bounce = celebrate;
    }

    g.position.set(w.x, terrainHeight(w.x, w.z) + bounce, w.z);
    if (moving) {
      const targetRot = Math.atan2(w.tx - w.x, w.tz - w.z);
      g.rotation.y += (targetRot - g.rotation.y) * 0.08;
    }

    // chu kỳ bước chân — chân và tay vung ngược nhau
    const swing = Math.sin(t * 7) * 0.65 * w.blend;
    if (leftLeg.current) leftLeg.current.rotation.x = swing;
    if (rightLeg.current) rightLeg.current.rotation.x = -swing;
    if (leftArm.current) leftArm.current.rotation.x = -swing * 0.8 + (celebrate ? -2.4 : 0);
    if (rightArm.current) rightArm.current.rotation.x = swing * 0.8 + (celebrate ? -2.4 : 0);

    // buồn thì cúi đầu
    const bodyTilt = sad ? 0.18 : 0;
    g.rotation.x += (bodyTilt - g.rotation.x) * 0.04;
  });


  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation();
        selectChild(child.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(child.id);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = "default";
      }}
    >
      <group scale={scale}>
        {/* vùng click lớn (vô hình) */}
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[1.3, 8, 8]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {/* chân */}
        <group ref={leftLeg} position={[-0.13, 0.52, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.36, 3, 6]} />
            <meshStandardMaterial color={look.pants} roughness={1} />
          </mesh>
        </group>
        <group ref={rightLeg} position={[0.13, 0.52, 0]}>
          <mesh position={[0, -0.26, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.36, 3, 6]} />
            <meshStandardMaterial color={look.pants} roughness={1} />
          </mesh>
        </group>

        {/* thân áo */}
        <mesh position={[0, 0.78, 0]} castShadow>
          <capsuleGeometry args={[0.22, 0.4, 4, 10]} />
          <meshStandardMaterial color={look.shirt} roughness={0.95} />
        </mesh>

        {/* tay */}
        <group ref={leftArm} position={[-0.28, 0.98, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.3, 3, 6]} />
            <meshStandardMaterial color={look.skin} roughness={1} />
          </mesh>
        </group>
        <group ref={rightArm} position={[0.28, 0.98, 0]}>
          <mesh position={[0, -0.22, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.3, 3, 6]} />
            <meshStandardMaterial color={look.skin} roughness={1} />
          </mesh>
        </group>

        {/* đầu + tóc */}
        <mesh position={[0, 1.38, 0]} castShadow>
          <sphereGeometry args={[0.26, 14, 14]} />
          <meshStandardMaterial color={look.skin} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
          <meshStandardMaterial color="#1c120a" roughness={1} />
        </mesh>

        {/* vòng chọn */}
        {(hovered || selected) && (
          <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.65, 24]} />
            <meshBasicMaterial color="#ffd166" toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      {/* điểm neo cho nhãn DOM (bong bóng thoại, chỉ số) */}
      <object3D ref={anchorRef(`c:${child.id}`)} position={[0, 1.95 * scale, 0]} />
    </group>
  );
}
