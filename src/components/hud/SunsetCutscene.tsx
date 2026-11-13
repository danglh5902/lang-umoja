"use client";

import { useEffect, useState } from "react";
import { useWorld } from "@/store/world";
import { introAudio } from "@/lib/introAudio";

const LINES = [
  "Tòa nhà rác cuối cùng đã sụp đổ.",
  "Tiếng server rì rầm tắt hẳn. Lần đầu tiên sau bao năm, làng Umoja im ắng đến mức nghe được tiếng gió.",
  "Rồi — tiếng nước. Suối chảy trở lại. Rễ cây len qua những móng bê tông nứt vỡ.",
  "Lũ trẻ chạy ùa ra ruộng. Chúng không còn phải xếp hàng lấy nước. Chúng chỉ việc... làm trẻ con.",
  "Lời tiên tri đã thành sự thật: thế giới mới mở ra cho lũ trẻ.",
  "Và cánh cổng này — đã đến lúc khép lại.",
];

export default function SunsetCutscene() {
  const [line, setLine] = useState(0);
  const setCinematic = useWorld((s) => s.setCinematic);

  useEffect(() => {
    setCinematic({ pos: [70, 55, 70], target: [0, 0, 2], orbit: { radius: 85, height: 55, speed: 0.05 } });
    introAudio.start();
    introAudio.rise();
    return () => introAudio.stop();
  }, [setCinematic]);

  useEffect(() => {
    if (line >= LINES.length - 1) return;
    const t = setTimeout(() => setLine((l) => l + 1), 4200);
    return () => clearTimeout(t);
  }, [line]);

  const done = line >= LINES.length - 1;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,240,200,0.06),rgba(0,15,8,0.6))]" />
      <div className="film-grain" />
      <div className="absolute inset-x-0 top-0 h-[11vh] bg-black" />
      <div className="absolute inset-x-0 bottom-0 h-[11vh] bg-black" />
      <div className="absolute inset-x-0 bottom-[14vh] flex justify-center px-6">
        <div className="max-w-2xl text-center">
          <p className="font-serif text-sm font-semibold uppercase tracking-[0.4em] text-emerald-100/60">Hồi kết</p>
          <p
            key={line}
            className="mt-4 font-serif text-2xl italic leading-relaxed text-emerald-50 md:text-3xl"
            style={{ animation: "fadeUp 1.4s ease-out", textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}
          >
            {LINES[line]}
          </p>
          {done && (
            <a
              href="/epilogue"
              className="mt-8 inline-block rounded-full bg-emerald-500 px-8 py-3 text-base font-black text-black shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:bg-emerald-400"
              style={{ animation: "fadeUp 1s ease-out" }}
            >
              🌍 Bước vào Thế Giới Mới
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
