"use client";

import { useMemo, useRef } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import Terrain from "./Terrain";
import PhaseEnvironment from "./PhaseEnvironment";
import BuildingMesh from "./BuildingMesh";
import ChildMesh from "./ChildMesh";
import Village from "./Village";
import LabelProjector from "../labels/LabelProjector";
import { labelAnchors } from "../labels/labelBus";
import { BOARD_ROT, BOARD_SPOTS } from "./VillageBoards";
import { terrainHeight } from "./Terrain";
import { GRID_SIZE, TILE, gridToWorld, type WorldData } from "@/lib/world-types";
import { useWorld } from "@/store/world";

const PAN_LIMIT = (GRID_SIZE * TILE) / 2 + 12;

/** Khoảng cách camera mong muốn khi vừa chọn từng loại đối tượng */
const FOCUS_DIST = { building: 42, child: 13, board: 15, point: 0 } as const;
const FOCUS_TRANSITION_S = 1.8;

function CameraRig({ world }: { world: WorldData }) {
  const controls = useThree((s) => s.controls) as unknown as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const selectedBuildingId = useWorld((s) => s.selectedBuildingId);
  const selectedChildId = useWorld((s) => s.selectedChildId);
  const openBoard = useWorld((s) => s.openBoard);
  const focusPoint = useWorld((s) => s.focusPoint);
  const setFocusPoint = useWorld((s) => s.setFocusPoint);
  const cinematic = useWorld((s) => s.cinematic);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const prevTarget = useMemo(() => new THREE.Vector3(), []);
  const delta = useMemo(() => new THREE.Vector3(), []);
  const focus = useRef<{ key: string | null; since: number }>({ key: null, since: 0 });

  useFrame(({ clock }) => {
    if (!controls) return;

    // Góc máy điện ảnh (intro, cutscene): khóa điều khiển, camera lướt tới vị trí đạo diễn
    if (cinematic) {
      controls.enabled = false;
      const tgt = tmp.set(...cinematic.target);
      controls.target.lerp(tgt, 0.025);
      if (cinematic.orbit) {
        const { radius, height, speed } = cinematic.orbit;
        const a = clock.elapsedTime * speed;
        camera.position.lerp(
          new THREE.Vector3(tgt.x + Math.cos(a) * radius, tgt.y + height, tgt.z + Math.sin(a) * radius),
          0.02
        );
      } else {
        camera.position.lerp(new THREE.Vector3(...cinematic.pos), 0.022);
      }
      camera.lookAt(controls.target);
      return;
    }
    controls.enabled = true;

    // xác định mục tiêu đang được chọn
    let target: THREE.Vector3 | null = null;
    let kind: keyof typeof FOCUS_DIST = "point";
    let key: string | null = null;
    let boardFront: THREE.Vector3 | null = null;

    if (focusPoint) {
      key = `p:${focusPoint[0].toFixed(1)},${focusPoint[1].toFixed(1)}`;
      target = tmp.set(focusPoint[0], 2, focusPoint[1]);
      if (Math.hypot(controls.target.x - focusPoint[0], controls.target.z - focusPoint[1]) < 1.5) {
        setFocusPoint(null);
      }
    } else if (selectedBuildingId) {
      const b = world.buildings.find((x) => x.id === selectedBuildingId);
      if (b) {
        const [x, z] = gridToWorld(b.gridX, b.gridY);
        key = `b:${b.id}`;
        kind = "building";
        target = tmp.set(x, 4, z);
      }
    } else if (selectedChildId) {
      key = `c:${selectedChildId}`;
      kind = "child";
      // bám theo vị trí thật của em bé (các em luôn đi lại quanh nhà)
      const anchor = labelAnchors.get(key);
      if (anchor) {
        anchor.getWorldPosition(tmp);
        tmp.y -= 0.9;
        target = tmp;
      } else {
        const c = world.children.find((x) => x.id === selectedChildId);
        if (c) {
          const [x, z] = gridToWorld(c.gridX, c.gridY);
          target = tmp.set(x, 1.2, z);
        }
      }
    } else if (openBoard) {
      const [bx, bz] = BOARD_SPOTS[openBoard];
      const rot = BOARD_ROT[openBoard];
      key = `board:${openBoard}`;
      kind = "board";
      target = tmp.set(bx, terrainHeight(bx, bz) + 3.2, bz);
      // điểm đứng chính diện mặt bảng
      boardFront = new THREE.Vector3(
        bx + Math.sin(rot) * FOCUS_DIST.board,
        target.y + 4.5,
        bz + Math.cos(rot) * FOCUS_DIST.board
      );
    }

    if (key !== focus.current.key) focus.current = { key, since: clock.elapsedTime };
    const inTransition = clock.elapsedTime - focus.current.since < FOCUS_TRANSITION_S;

    if (target) {
      // trượt cả camera theo mục tiêu → đối tượng về giữa khung hình, giữ nguyên góc nhìn
      prevTarget.copy(controls.target);
      controls.target.lerp(target, kind === "child" ? 0.12 : 0.08);
      delta.subVectors(controls.target, prevTarget);
      camera.position.add(delta);

      if (inTransition) {
        if (boardFront) {
          // bảng gỗ: vòng ra đứng trước mặt bảng để đọc được chữ
          camera.position.lerp(boardFront, 0.07);
        } else if (FOCUS_DIST[kind] > 0) {
          // lại gần nếu đang đứng quá xa (không đẩy ra nếu người chơi đã zoom gần hơn)
          const offset = delta.subVectors(camera.position, controls.target);
          const dist = offset.length();
          const want = FOCUS_DIST[kind];
          if (dist > want) {
            offset.setLength(THREE.MathUtils.lerp(dist, want, 0.07));
            camera.position.copy(controls.target).add(offset);
          }
        }
      }
    }

    // giới hạn vùng khám phá trong map
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -PAN_LIMIT, PAN_LIMIT);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -PAN_LIMIT, PAN_LIMIT);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 12);
    controls.update();
  });
  return null;
}

export default function WorldCanvas({ world, hour }: { world: WorldData; hour: number }) {
  const selectBuilding = useWorld((s) => s.selectBuilding);
  const setOpenBoard = useWorld((s) => s.setOpenBoard);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [26, 30, 46], fov: 45, far: 900 }}
      onPointerMissed={() => {
        selectBuilding(null);
        setOpenBoard(null);
      }}
      style={{ touchAction: "none" }}
    >
      <PhaseEnvironment phase={world.phase} hour={hour} />
      <Terrain world={world} />
      <Village world={world} />
      {world.buildings.map((b) => (
        <BuildingMesh key={b.id} building={b} />
      ))}
      {world.children.map((c) => (
        <ChildMesh key={c.id} child={c} />
      ))}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={150}
        minPolarAngle={0.2}
        maxPolarAngle={1.42}
        enablePan
        panSpeed={0.9}
        screenSpacePanning={false}
      />
      <CameraRig world={world} />
      <LabelProjector />
      <EffectComposer multisampling={2}>
        <Bloom luminanceThreshold={1} mipmapBlur intensity={0.75} />
        <Vignette eskil={false} offset={0.22} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  );
}
