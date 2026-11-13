"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { labelAnchors, labelElements } from "./labelBus";

/** Đặt trong <Canvas>: chiếu các anchor 3D thành vị trí màn hình cho nhãn DOM. */
export default function LabelProjector() {
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    for (const [id, el] of labelElements) {
      const anchor = labelAnchors.get(id);
      if (!anchor) {
        el.style.display = "none";
        continue;
      }
      anchor.getWorldPosition(v);
      const dist = camera.position.distanceTo(v);
      v.project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15) {
        el.style.display = "none";
        continue;
      }
      const base = Number(el.dataset.scale ?? 45);
      const maxDist = Number(el.dataset.maxdist ?? 9999);
      if (dist > maxDist) {
        el.style.display = "none";
        continue;
      }
      el.style.display = "";
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      const s = THREE.MathUtils.clamp(base / dist, 0.42, 1.25);
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.zIndex = String(Math.max(1, Math.round(2000 - dist * 4)));
      const inner = el.firstElementChild as HTMLElement | null;
      if (inner) inner.style.transform = `translate(-50%, -100%) scale(${s.toFixed(3)})`;
    }
  });

  return null;
}
