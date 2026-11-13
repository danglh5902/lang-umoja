"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { gridToWorld, VILLAGE_CENTER, type WorldData } from "@/lib/world-types";
import { useWorld, type CinematicShot } from "@/store/world";
import { introAudio } from "@/lib/introAudio";

type Fx = "warm" | "quake" | "drought" | "prophecy" | "dawn";
type Seg = { t: string; c?: "glitch" | "gold" | "blood" };

interface Scene {
  numeral: string;
  title: string;
  segs: Seg[];
  fx: Fx;
  shot: (w: WorldData) => CinematicShot;
  sound: (a: typeof introAudio) => void;
}

const [VX, VZ] = gridToWorld(VILLAGE_CENTER[0], VILLAGE_CENTER[1]);

function biggestStanding(w: WorldData) {
  const standing = w.buildings.filter((b) => b.status === "STANDING");
  const pool = standing.length ? standing : w.buildings;
  return [...pool].sort((a, b) => b.goalAmount - a.goalAmount)[0];
}

const SCENES: Scene[] = [
  {
    numeral: "I",
    title: "Thuở Ấy",
    segs: [
      {
        t: "Người già ở Umoja vẫn kể: thuở ấy, suối hát quanh chân đồi, ngô trổ vàng tận chân trời, và tiếng cười trẻ con vang xa hơn cả tiếng trống làng.",
      },
    ],
    fx: "warm",
    shot: () => ({ pos: [60, 48, 60], target: [VX, 0, VZ], orbit: { radius: 78, height: 46, speed: 0.04 } }),
    sound: () => {},
  },
  {
    numeral: "II",
    title: "Chúng Đến",
    segs: [
      { t: "Rồi một đêm không trăng, chúng đến. Không có tiếng vó ngựa — chỉ có tiếng quạt tản nhiệt rít lên trong bóng tối. Sáng hôm sau, những khối bê tông xám đã đứng sừng sững trên ruộng ngô: " },
      { t: "ChatPhở AI. Trâu NFT 4.0. Mạng Xã Hội Bot...", c: "glitch" },
    ],
    fx: "quake",
    shot: (w) => {
      const b = biggestStanding(w);
      const [x, z] = b ? gridToWorld(b.gridX, b.gridY) : [0, 0];
      return { pos: [x + 16, 7, z + 20], target: [x, 9, z] };
    },
    sound: (a) => {
      a.boom();
      setTimeout(() => a.whine(), 900);
      setTimeout(() => a.boom(), 2600);
    },
  },
  {
    numeral: "III",
    title: "Cơn Khát",
    segs: [
      { t: "Chúng uống. Ngày đêm, không bao giờ no. Mỗi tòa nuốt hàng trăm nghìn lít nước chỉ để làm mát những cỗ máy sản xuất thứ không ai cần. Giếng làng trơ đáy. Suối hóa thành một vết sẹo nứt nẻ. Và lũ trẻ... " },
      { t: "bắt đầu biết đói.", c: "blood" },
    ],
    fx: "drought",
    shot: () => ({ pos: [VX + 9, 4.5, VZ + 12], target: [VX, 1.2, VZ] }),
    sound: (a) => a.heartbeat(5),
  },
  {
    numeral: "IV",
    title: "Lời Tiên Tri",
    segs: [
      { t: "Nhưng trước khi nhắm mắt, bà đồng già của làng đã khắc lên tảng đá dưới gốc cây cuối cùng một lời tiên tri: " },
      {
        t: "«Khi tòa nhà rác cuối cùng sụp đổ, một thế giới mới sẽ mở ra cho những đứa trẻ — và cánh cổng dẫn tới nơi này sẽ khép lại mãi mãi.»",
        c: "gold",
      },
    ],
    fx: "prophecy",
    shot: () => ({ pos: [VX - 10, 120, VZ + 30], target: [VX, 0, VZ] }),
    sound: (a) => a.chime(),
  },
  {
    numeral: "V",
    title: "Người Gieo Mầm",
    segs: [
      { t: "Cánh cổng ấy chính là nơi bạn đang đứng. Mỗi chút nhân đạo bạn góp là một nhát búa, một ổ bánh mì, một mầm cây. Nhưng hãy cẩn thận — " },
      { t: "kẻ xấu vẫn đang lén tung thêm hủy diệt, dựng những tòa nhà mới trong đêm.", c: "blood" },
      { t: " Bạn sẽ đứng về phía nào?" },
    ],
    fx: "dawn",
    shot: () => ({ pos: [26, 30, 46], target: [VX, 0, VZ] }),
    sound: (a) => a.rise(),
  },
];

const segClass = (c?: Seg["c"]) =>
  c === "glitch" ? "glitch font-bold" : c === "gold" ? "gold-text not-italic" : c === "blood" ? "blood-text" : "";

/** Hiện chữ dần như máy đánh chữ, giữ đúng định dạng từng đoạn */
function Typewriter({ segs, onDone }: { segs: Seg[]; onDone: () => void }) {
  const total = useMemo(() => segs.reduce((a, s) => a + Array.from(s.t).length, 0), [segs]);
  const [n, setN] = useState(0);
  const doneRef = useRef(false);

  useEffect(() => {
    setN(0);
    doneRef.current = false;
    const t = setInterval(() => {
      setN((x) => {
        const next = Math.min(total, x + 1);
        if (next >= total && !doneRef.current) {
          doneRef.current = true;
          setTimeout(onDone, 0);
        }
        return next;
      });
    }, 32);
    return () => clearInterval(t);
  }, [segs, total, onDone]);

  let remaining = n;
  return (
    <>
      {segs.map((s, i) => {
        const chars = Array.from(s.t);
        const shown = chars.slice(0, Math.max(0, remaining)).join("");
        remaining -= chars.length;
        return (
          <span key={i} className={segClass(s.c)}>
            {shown}
          </span>
        );
      })}
      {n < total && <span className="ml-0.5 inline-block w-[2px] bg-white/80 align-middle" style={{ height: "1em", animation: "caret 0.8s infinite" }} />}
    </>
  );
}

function Embers({ color = "#ffb36b", count = 26 }: { color?: string; count?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: `${(i * 37) % 100}%`,
        size: 2 + ((i * 7) % 4),
        delay: `${(i * 0.53) % 7}s`,
        dur: `${7 + ((i * 3) % 6)}s`,
        drift: `${((i * 13) % 80) - 40}px`,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {items.map((e, i) => (
        <span
          key={i}
          className="absolute bottom-[-10px] rounded-full"
          style={
            {
              left: e.left,
              width: e.size,
              height: e.size,
              background: color,
              boxShadow: `0 0 8px ${color}`,
              animation: `ember ${e.dur} linear ${e.delay} infinite`,
              "--drift": e.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

const FX_OVERLAY: Record<Fx, string> = {
  warm: "bg-[radial-gradient(ellipse_at_center,rgba(255,190,90,0.10),rgba(40,20,0,0.55))]",
  quake: "bg-[radial-gradient(ellipse_at_center,rgba(80,0,0,0.15),rgba(10,0,0,0.7))]",
  drought: "bg-[radial-gradient(ellipse_at_center,rgba(120,80,30,0.1),rgba(20,10,0,0.7))] backdrop-saturate-[0.35] backdrop-sepia-[0.35]",
  prophecy: "bg-[radial-gradient(ellipse_at_center,rgba(20,30,70,0.35),rgba(0,0,10,0.85))]",
  dawn: "bg-[radial-gradient(ellipse_at_center,rgba(255,240,200,0.05),rgba(0,20,10,0.55))]",
};

export default function IntroOverlay({ world, onDone }: { world: WorldData; onDone: () => void }) {
  const setCinematic = useWorld((s) => s.setCinematic);
  const [stage, setStage] = useState<"gate" | "story">("gate");
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState(false);
  const [muted, setMuted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const scene = SCENES[i];
  const last = i === SCENES.length - 1;

  // rời intro bằng bất kỳ đường nào (chuyển trang, bỏ qua...) → trả lại quyền điều khiển camera
  useEffect(() => {
    return () => {
      useWorld.getState().setCinematic(null);
      introAudio.stop();
    };
  }, []);

  // mỗi chương: góc máy + âm thanh riêng
  useEffect(() => {
    if (stage !== "story") return;
    setTyped(false);
    setCinematic(SCENES[i].shot(world));
    SCENES[i].sound(introAudio);
    // world chỉ cần lúc chọn góc máy, không đổi góc khi dữ liệu cập nhật
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, i, setCinematic]);

  // tự sang chương sau khi đã đọc xong
  useEffect(() => {
    if (!typed || last || stage !== "story") return;
    const t = setTimeout(() => setI((x) => x + 1), 3800);
    return () => clearTimeout(t);
  }, [typed, last, stage]);

  const finish = () => {
    setLeaving(true);
    introAudio.stop();
    setCinematic({ pos: [26, 30, 46], target: [VX, 0, VZ] });
    setTimeout(() => {
      setCinematic(null);
      onDone();
    }, 1400);
  };

  const onTyped = useMemo(() => () => setTyped(true), []);

  if (stage === "gate") {
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,#0d1f15_0%,#030806_70%)] p-6 text-center">
        <div className="film-grain" />
        <Embers color="#8dffb4" count={18} />
        <div className="relative text-7xl" style={{ animation: "pulseGlow 3.2s ease-in-out infinite" }}>
          🌱
        </div>
        <p className="relative mt-8 font-serif text-2xl italic text-emerald-100/90 md:text-3xl" style={{ animation: "fadeUp 1.6s ease-out" }}>
          Có một lời tiên tri về ngôi làng này...
        </p>
        <button
          onClick={() => {
            introAudio.start();
            setStage("story");
          }}
          className="relative mt-10 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-8 py-3 font-serif text-lg font-semibold tracking-wide text-emerald-100 shadow-[0_0_40px_rgba(110,255,170,0.25)] transition hover:bg-emerald-400/20"
          style={{ animation: "fadeUp 2.2s ease-out" }}
        >
          Chạm để mở cánh cổng
        </button>
        <p className="relative mt-4 text-xs text-white/40">🔊 Bật âm thanh để trải nghiệm trọn vẹn</p>
        <button onClick={onDone} className="relative mt-8 text-xs text-white/35 underline hover:text-white/70">
          Bỏ qua phần dẫn truyện
        </button>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 z-40 transition-opacity duration-[1400ms] ${leaving ? "opacity-0" : "opacity-100"}`}
      style={scene.fx === "quake" && !leaving ? { animation: "quake 0.7s ease-in-out 3" } : undefined}
    >
      {/* màu không khí của chương */}
      <div key={`fx-${i}`} className={`absolute inset-0 transition-all duration-1000 ${FX_OVERLAY[scene.fx]}`} style={{ animation: "fadeIn 1.5s" }} />
      <div className="film-grain" />
      {scene.fx === "quake" && <div key={`flash-${i}`} className="pointer-events-none absolute inset-0 bg-red-700" style={{ animation: "redFlash 1.6s ease-out forwards" }} />}
      {scene.fx === "dawn" && <div key={`wflash-${i}`} className="pointer-events-none absolute inset-0 bg-amber-50" style={{ animation: "whiteFlash 2.4s ease-out forwards" }} />}
      {scene.fx === "prophecy" && <Embers color="#ffd98a" />}
      {scene.fx === "warm" && <Embers color="#ffb36b" count={14} />}

      {/* khung điện ảnh (letterbox) */}
      <div className="absolute inset-x-0 top-0 h-[11vh] bg-black" style={{ animation: "fadeIn 1s" }} />
      <div className="absolute inset-x-0 bottom-0 h-[11vh] bg-black" style={{ animation: "fadeIn 1s" }} />

      {/* điều khiển */}
      <div className="absolute right-4 top-[calc(11vh-40px)] z-10 flex gap-2 text-xs">
        <button
          onClick={() => {
            introAudio.setMuted(!muted);
            setMuted(!muted);
          }}
          className="rounded-full bg-white/10 px-3 py-1.5 text-white/70 hover:bg-white/20"
        >
          {muted ? "🔇" : "🔊"}
        </button>
        <button onClick={finish} className="rounded-full bg-white/10 px-3 py-1.5 text-white/70 hover:bg-white/20">
          Bỏ qua ⏭
        </button>
      </div>

      {/* chữ */}
      <div className="absolute inset-x-0 bottom-[13vh] flex justify-center px-6">
        <div key={`txt-${i}`} className="max-w-3xl text-center" style={{ animation: "fadeUp 1.2s ease-out" }}>
          <div className="flex items-center justify-center gap-4">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-white/40" />
            <span className="font-serif text-sm font-semibold uppercase tracking-[0.4em] text-white/60">
              Chương {scene.numeral}
            </span>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-white/40" />
          </div>
          <h2
            className={`mt-2 font-serif text-4xl font-black md:text-6xl ${
              scene.fx === "quake" || scene.fx === "drought"
                ? "text-red-200"
                : scene.fx === "prophecy"
                  ? "gold-text"
                  : "text-amber-50"
            }`}
            style={{ textShadow: "0 4px 30px rgba(0,0,0,0.8)" }}
          >
            {scene.title}
          </h2>
          <p
            className="mt-5 min-h-[6.5em] font-serif text-lg italic leading-relaxed text-white/90 md:text-2xl"
            style={{ textShadow: "0 2px 16px rgba(0,0,0,0.9)" }}
          >
            <Typewriter segs={scene.segs} onDone={onTyped} />
          </p>

          <div className="mt-4 flex min-h-[48px] items-center justify-center gap-3">
            {last && typed ? (
              <>
                <button
                  onClick={finish}
                  className="rounded-full bg-emerald-500 px-8 py-3 font-black text-black shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:bg-emerald-400"
                  style={{ animation: "fadeUp 0.8s ease-out" }}
                >
                  🌱 Trở thành Người Gieo Mầm
                </button>
                <Link
                  href="/sabotage"
                  onClick={() => {
                    introAudio.stop();
                    setCinematic(null);
                    onDone();
                  }}
                  className="rounded-full border border-red-500/50 px-5 py-3 text-sm font-bold text-red-300 hover:bg-red-950/50"
                  style={{ animation: "fadeUp 1.2s ease-out" }}
                >
                  😈 ...hay làm kẻ xấu
                </Link>
              </>
            ) : (
              <button
                onClick={() => (typed ? setI(i + 1) : setTyped(true))}
                className={`text-sm text-white/50 hover:text-white/90 ${typed ? "" : "invisible"}`}
              >
                Tiếp tục ›
              </button>
            )}
          </div>
          {/* tiến trình chương */}
          <div className="mt-3 flex justify-center gap-1.5">
            {SCENES.map((_, idx) => (
              <span key={idx} className={`h-1 rounded-full transition-all duration-500 ${idx === i ? "w-8 bg-white/80" : idx < i ? "w-2 bg-white/50" : "w-2 bg-white/20"}`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
