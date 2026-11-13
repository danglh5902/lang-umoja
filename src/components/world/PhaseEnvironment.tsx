"use client";

import { useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky, SoftShadows, Clouds, Cloud, Stars } from "@react-three/drei";
import * as THREE from "three";
import { envState, sunState } from "@/lib/daytime";

/** Màu/độ trong của không khí theo hồi truyện (ô nhiễm → trong lành) */
const PALETTES: Record<number, { fog: string; ambient: number; turbidity: number; rayleigh: number }> = {
  1: { fog: "#cfb089", ambient: 0.5, turbidity: 14, rayleigh: 2.6 },
  2: { fog: "#cbc79a", ambient: 0.6, turbidity: 9, rayleigh: 1.8 },
  3: { fog: "#cfe6ef", ambient: 0.75, turbidity: 5, rayleigh: 1.1 },
  4: { fog: "#e2f4ff", ambient: 0.9, turbidity: 3, rayleigh: 0.7 },
};

const NIGHT_FOG = new THREE.Color("#0b1222");
const GOLDEN_FOG = new THREE.Color("#e39a5c");
const DAY_SUN = new THREE.Color("#fff1d6");
const GOLDEN_SUN = new THREE.Color("#ff9a4a");

/** Chim bay lượn trên trời từ Hồi III, chỉ ban ngày */
function Birds({ phase }: { phase: number }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const target = phase >= 3 && envState.daylight > 0.4 ? 1 : 0;
    g.scale.setScalar(Math.max(0.0001, THREE.MathUtils.lerp(g.scale.x, target, 0.01)));
    g.children.forEach((bird, i) => {
      const speed = 0.12 + i * 0.015;
      const r = 34 + i * 7;
      bird.position.set(Math.cos(t * speed + i * 2) * r, 22 + Math.sin(t * 0.5 + i) * 2.5, Math.sin(t * speed + i * 2) * r);
      bird.rotation.y = -(t * speed + i * 2) + Math.PI;
      const flap = Math.sin(t * 7 + i) * 0.5;
      (bird.children[0] as THREE.Mesh).rotation.z = flap;
      (bird.children[1] as THREE.Mesh).rotation.z = -flap;
    });
  });
  return (
    <group ref={group} scale={0.0001}>
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i}>
          <mesh position={[-0.35, 0, 0]}>
            <boxGeometry args={[0.7, 0.03, 0.22]} />
            <meshStandardMaterial color="#2c2c34" />
          </mesh>
          <mesh position={[0.35, 0, 0]}>
            <boxGeometry args={[0.7, 0.03, 0.22]} />
            <meshStandardMaterial color="#2c2c34" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Đom đóm bay quanh làng ban đêm (Hồi II trở đi) */
function Fireflies({ phase }: { phase: number }) {
  const ref = useRef<THREE.Points>(null);
  const COUNT = 60;
  const [base] = useState(() => {
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = 0.6 + Math.random() * 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  });
  const [pos] = useState(() => new Float32Array(base));
  useFrame(({ clock }) => {
    const p = ref.current;
    if (!p) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.4 + i) * 1.5;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.9 + i * 1.7) * 0.4;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.35 + i) * 1.5;
    }
    p.geometry.attributes.position.needsUpdate = true;
    const mat = p.material as THREE.PointsMaterial;
    const target = phase >= 2 ? (1 - envState.daylight) * 0.95 : 0;
    mat.opacity += (target - mat.opacity) * 0.02;
    p.visible = mat.opacity > 0.02;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[pos, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#d8ff7a" size={0.35} transparent opacity={0} toneMapped={false} depthWrite={false} />
    </points>
  );
}

export default function PhaseEnvironment({ phase, hour }: { phase: number; hour: number }) {
  const { scene } = useThree();
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const moonRef = useRef<THREE.DirectionalLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const starsRef = useRef<THREE.Group>(null);
  const fogColor = useRef(new THREE.Color(PALETTES[1].fog));
  const cloudsRef = useRef<THREE.Group>(null);

  const [sky, setSky] = useState({ sunPos: [80, 40, -40] as [number, number, number], turbidity: 14, rayleigh: 2.6 });
  const skyCur = useRef({ pos: new THREE.Vector3(80, 40, -40), turbidity: 14, rayleigh: 2.6, daylight: 1 });
  const lastSkyUpdate = useRef(0);

  useFrame(({ clock }) => {
    const p = PALETTES[Math.min(4, Math.max(1, phase))];
    const sun = sunState(hour);
    const sc = skyCur.current;

    // nội suy mượt để chuyển cảnh không giật
    sc.pos.lerp(new THREE.Vector3(...sun.sunPos), 0.02);
    sc.turbidity += (p.turbidity - sc.turbidity) * 0.01;
    sc.rayleigh += (p.rayleigh - sc.rayleigh) * 0.01;
    sc.daylight += (sun.daylight - sc.daylight) * 0.02;
    envState.daylight = sc.daylight;
    const night = 1 - sc.daylight;

    // sương mù: màu theo hồi × giờ (đêm tối, hoàng hôn ửng cam)
    const targetFog = new THREE.Color(p.fog).lerp(GOLDEN_FOG, sun.golden * 0.45).lerp(NIGHT_FOG, night);
    fogColor.current.lerp(targetFog, 0.03);
    if (!scene.fog) scene.fog = new THREE.Fog(fogColor.current, 90, 320);
    const fog = scene.fog as THREE.Fog;
    fog.color = fogColor.current;
    fog.near = 90 - night * 30;
    fog.far = 320 - night * 90;

    if (sunRef.current) {
      sunRef.current.position.copy(sc.pos.y > 2 ? sc.pos : new THREE.Vector3(sc.pos.x, 2, sc.pos.z));
      sunRef.current.intensity = 2.4 * sc.daylight;
      sunRef.current.color.copy(DAY_SUN).lerp(GOLDEN_SUN, sun.golden * 0.8);
    }
    if (moonRef.current) {
      moonRef.current.intensity = 0.55 * night;
    }
    if (ambientRef.current) {
      const target = p.ambient * (0.28 + 0.72 * sc.daylight);
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.03;
      ambientRef.current.color.set(night > 0.5 ? "#9fb4ff" : "#ffffff");
    }
    if (hemiRef.current) hemiRef.current.intensity = 0.12 + 0.35 * sc.daylight;
    if (starsRef.current) starsRef.current.visible = night > 0.35;

    if (clock.elapsedTime - lastSkyUpdate.current > 0.2) {
      lastSkyUpdate.current = clock.elapsedTime;
      setSky({ sunPos: [sc.pos.x, sc.pos.y, sc.pos.z], turbidity: sc.turbidity, rayleigh: sc.rayleigh });
    }

    if (cloudsRef.current) {
      cloudsRef.current.position.x = ((clock.elapsedTime * 0.6) % 300) - 150;
    }
  });

  return (
    <>
      <SoftShadows size={30} samples={12} focus={0.6} />
      <Sky
        distance={4500}
        sunPosition={sky.sunPos}
        turbidity={sky.turbidity}
        rayleigh={sky.rayleigh}
        mieCoefficient={0.006}
        mieDirectionalG={0.85}
      />
      <group ref={starsRef} visible={false}>
        <Stars radius={260} depth={60} count={4000} factor={5} saturation={0.2} fade speed={0.4} />
        {/* mặt trăng */}
        <mesh position={[-140, 150, 120]}>
          <sphereGeometry args={[7, 24, 24]} />
          <meshBasicMaterial color="#f4f1e0" toneMapped={false} fog={false} />
        </mesh>
      </group>
      <ambientLight ref={ambientRef} intensity={0.5} />
      <directionalLight
        ref={sunRef}
        position={[80, 40, -40]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-far={400}
        shadow-bias={-0.0004}
      />
      {/* ánh trăng xanh lạnh */}
      <directionalLight ref={moonRef} position={[-70, 80, 60]} color="#8fa8ff" intensity={0} />
      <hemisphereLight ref={hemiRef} args={["#eaf3ff", "#8a6a40", 0.45]} />
      <group ref={cloudsRef}>
        <Clouds material={THREE.MeshLambertMaterial} limit={200}>
          <Cloud segments={16} bounds={[30, 4, 14]} volume={16} color="#fff6ea" position={[-60, 42, -30]} opacity={0.55} speed={0.08} />
          <Cloud segments={14} bounds={[24, 4, 12]} volume={14} color="#ffffff" position={[30, 48, 20]} opacity={0.5} speed={0.06} />
          <Cloud segments={12} bounds={[20, 3, 10]} volume={12} color="#fdf3e3" position={[90, 38, -70]} opacity={0.45} speed={0.07} />
        </Clouds>
      </group>
      <Birds phase={phase} />
      <Fireflies phase={phase} />
    </>
  );
}
