"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { connectWorldEvents, useWorld } from "@/store/world";
import { sunState, useRealHour } from "@/lib/daytime";
import { installSfxUnlock } from "@/lib/sfx";
import { setAmbientActive, updateAmbientMood } from "@/lib/ambient";
import Hud from "./hud/Hud";
import IntroOverlay from "./hud/IntroOverlay";
import SunsetCutscene from "./hud/SunsetCutscene";
import BuildingPanel from "./hud/BuildingPanel";
import ChildPanel from "./hud/ChildPanel";
import BoardPanel from "./hud/BoardPanel";
import LabelLayer from "./labels/LabelLayer";

const WorldCanvas = dynamic(() => import("./world/WorldCanvas"), {
  ssr: false,
  loading: () => <LoadingScreen />,
});

function LoadingScreen() {
  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-[#050b08] text-white">
      <div className="text-5xl" style={{ animation: "pulseGlow 2.4s ease-in-out infinite" }}>
        🌱
      </div>
      <p className="font-serif text-base italic text-emerald-100/60">Đang mở cánh cổng đến làng Umoja...</p>
    </div>
  );
}

export default function Home() {
  const world = useWorld((s) => s.world);
  const fetchWorld = useWorld((s) => s.fetchWorld);
  const introDone = useWorld((s) => s.introDone);
  const setIntroDone = useWorld((s) => s.setIntroDone);
  const sunsetStarted = useWorld((s) => s.sunsetStarted);
  const cinematic = useWorld((s) => s.cinematic);
  const selectedBuildingId = useWorld((s) => s.selectedBuildingId);
  const selectedChildId = useWorld((s) => s.selectedChildId);
  const [introChecked, setIntroChecked] = useState(false);
  const hour = useRealHour();

  useEffect(() => {
    void fetchWorld();
    const es = connectWorldEvents();
    // đồng bộ dự phòng mỗi 60s (chỉ số trẻ giảm dần theo thời gian)
    const t = setInterval(() => void fetchWorld(), 60000);
    try {
      if (localStorage.getItem("umoja-intro-seen") === "1") setIntroDone(true);
    } catch {}
    // góc máy điện ảnh chỉ thuộc về intro/cutscene đang chạy — không mang sang lần vào làng mới
    if (!useWorld.getState().sunsetStarted) useWorld.getState().setCinematic(null);
    setIntroChecked(true);
    return () => {
      es.close();
      clearInterval(t);
    };
  }, [fetchWorld, setIntroDone]);

  // ---- âm thanh nền của làng ----
  const playingCinematic = Boolean(cinematic) || !introDone || sunsetStarted;
  useEffect(() => {
    installSfxUnlock();
    return () => setAmbientActive(false); // rời làng → tắt nền
  }, []);
  useEffect(() => {
    // intro/cutscene có nhạc riêng → tạm tắt nền
    setAmbientActive(!playingCinematic);
  }, [playingCinematic]);
  const standingRatio = world
    ? world.buildings.filter((b) => b.status === "STANDING").length / Math.max(1, world.totalBuildings)
    : 1;
  const phaseNow = world?.phase ?? 1;
  useEffect(() => {
    updateAmbientMood({ phase: phaseNow, daylight: sunState(hour).daylight, standing: standingRatio });
  }, [phaseNow, hour, standingRatio]);

  const finishIntro = () => {
    setIntroDone(true);
    try {
      localStorage.setItem("umoja-intro-seen", "1");
    } catch {}
  };

  if (!world) return <LoadingScreen />;

  const selectedBuilding = world.buildings.find((b) => b.id === selectedBuildingId);
  const selectedChild = world.children.find((c) => c.id === selectedChildId);
  const inCinematic = Boolean(cinematic) || !introDone || sunsetStarted;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#1a1410]">
      <WorldCanvas world={world} hour={hour} />
      {!inCinematic && (
        <>
          <LabelLayer buildings={world.buildings} childList={world.children} hour={hour} />
          <Hud world={world} hour={hour} onReplayIntro={() => setIntroDone(false)} />
          {selectedBuilding && selectedBuilding.status === "STANDING" && <BuildingPanel building={selectedBuilding} />}
          {selectedChild && <ChildPanel child={selectedChild} items={world.items} />}
          <BoardPanel world={world} />
        </>
      )}
      {introChecked && !introDone && <IntroOverlay world={world} onDone={finishIntro} />}
      {sunsetStarted && <SunsetCutscene />}
    </main>
  );
}
