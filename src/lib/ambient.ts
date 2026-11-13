"use client";

/**
 * Âm thanh nền của làng — chạy liên tục khi người chơi đang ở trong làng.
 * Các lớp: gió · tiếng ù server (theo số tòa rác còn đứng) · nhạc kalimba ·
 * chim hót (ngày) · dế kêu (đêm) · lửa trại tí tách.
 * Mọi thứ đi qua đầu ra chung của sfx nên nút 🔊/🔇 tắt được cả âm thanh nền.
 */

import { audioOut, noiseBuffer, onAudioUnlocked } from "./sfx";

export interface AmbientMood {
  /** 1..4 — Bụi, Mầm, Suối, Thế Giới Mới */
  phase: number;
  /** 0 = đêm, 1 = ngày */
  daylight: number;
  /** tỉ lệ tòa rác còn đứng 0..1 */
  standing: number;
}

// thang ngũ cung: buồn ở Hồi I, sáng dần ở các hồi sau
const SAD_SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
const HOPE_SCALE = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25];

const amb = {
  wanted: false,
  running: false,
  c: null as AudioContext | null,
  bus: null as GainNode | null,
  windGain: null as GainNode | null,
  humGain: null as GainNode | null,
  sources: [] as AudioScheduledSourceNode[],
  timers: [] as ReturnType<typeof setTimeout>[],
  mood: { phase: 1, daylight: 1, standing: 1 } as AmbientMood,
};

function later(fn: () => void, ms: number) {
  amb.timers.push(setTimeout(fn, ms));
}

function start() {
  if (amb.running) return;
  const a = audioOut();
  if (!a) return; // chưa mở khóa — sẽ bật khi người xem chạm vào trang
  const { c, out } = a;
  amb.running = true;
  amb.c = c;

  const bus = c.createGain();
  bus.gain.value = 0;
  bus.gain.linearRampToValueAtTime(1, c.currentTime + 3);
  bus.connect(out);
  amb.bus = bus;

  // gió: nhiễu lọc thông thấp, độ mở bộ lọc dao động chậm như từng cơn
  const wind = c.createBufferSource();
  wind.buffer = noiseBuffer(c, 4);
  wind.loop = true;
  const wf = c.createBiquadFilter();
  wf.type = "lowpass";
  wf.frequency.value = 500;
  wf.Q.value = 0.7;
  const wg = c.createGain();
  wg.gain.value = 0.08;
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 260;
  lfo.connect(lfoGain).connect(wf.frequency);
  wind.connect(wf).connect(wg).connect(bus);
  wind.start();
  lfo.start();
  amb.windGain = wg;

  // tiếng ù của các trung tâm dữ liệu
  const hg = c.createGain();
  hg.gain.value = 0.03;
  const hf = c.createBiquadFilter();
  hf.type = "lowpass";
  hf.frequency.value = 180;
  hf.connect(hg).connect(bus);
  for (const f of [50, 100.4, 150.2]) {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    o.connect(hf);
    o.start();
    amb.sources.push(o);
  }
  amb.humGain = hg;
  amb.sources.push(wind, lfo);

  applyMood();
  later(kalimbaLoop, 1500);
  later(critterLoop, 2000);
  later(fireLoop, 1000);
}

function stop() {
  if (!amb.running) return;
  amb.running = false;
  amb.timers.forEach(clearTimeout);
  amb.timers = [];
  const { c, bus } = amb;
  const sources = amb.sources;
  amb.sources = [];
  amb.bus = null;
  if (c && bus) {
    bus.gain.setTargetAtTime(0, c.currentTime, 0.4);
    setTimeout(() => {
      sources.forEach((s) => {
        try {
          s.stop();
        } catch {}
      });
      bus.disconnect();
    }, 2500);
  }
}

function applyMood() {
  const c = amb.c;
  if (!c || !amb.running) return;
  const { phase, standing, daylight } = amb.mood;
  // làng càng hồi sinh, gió càng dịu; ban đêm gió lạnh hơn
  amb.windGain?.gain.setTargetAtTime(0.05 + (phase <= 1 ? 0.05 : 0) + (1 - daylight) * 0.02, c.currentTime, 2);
  // càng nhiều tòa rác càng ồn; về đêm nghe rõ hơn
  amb.humGain?.gain.setTargetAtTime(standing * (0.025 + (1 - daylight) * 0.015), c.currentTime, 2);
}

/** Một nốt kalimba: âm trong + bồi âm kim loại, tắt nhanh */
function kalimbaNote(c: AudioContext, freq: number, startAt: number, vol: number) {
  const t = c.currentTime + startAt;
  const partials: [number, number, number][] = [
    [1, vol, 1.6],
    [4.0, vol * 0.18, 0.4],
    [6.3, vol * 0.08, 0.25],
  ];
  for (const [mult, v, d] of partials) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(amb.bus!);
    o.start(t);
    o.stop(t + d + 0.05);
  }
}

function kalimbaLoop() {
  const c = amb.c;
  if (!amb.running || !c || !amb.bus) return;
  const scale = amb.mood.phase >= 2 ? HOPE_SCALE : SAD_SCALE;
  // câu nhạc ngắn 2–5 nốt, đi theo bậc liền nhau cho mềm mại
  let idx = Math.floor(Math.random() * scale.length);
  const notes = 2 + Math.floor(Math.random() * 4);
  const vol = 0.05 + (amb.mood.phase - 1) * 0.008;
  for (let i = 0; i < notes; i++) {
    idx = Math.max(0, Math.min(scale.length - 1, idx + Math.floor(Math.random() * 3) - 1));
    kalimbaNote(c, scale[idx], i * (0.28 + Math.random() * 0.2), vol);
  }
  if (Math.random() < 0.5) kalimbaNote(c, scale[0] / 2, 0, 0.04);
  later(kalimbaLoop, 3500 + Math.random() * 5000);
}

function chirp(c: AudioContext, t: number, f0: number, f1: number, dur: number, vol: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + Math.min(0.015, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(amb.bus!);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function critterLoop() {
  const c = amb.c;
  if (!amb.running || !c || !amb.bus) return;
  const { daylight, phase } = amb.mood;
  if (daylight < 0.4) {
    // dế kêu ban đêm: chuỗi xung cao tần
    const base = 4200 + Math.random() * 600;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) chirp(c, c.currentTime + k * 0.07, base, base, 0.05, 0.018);
  } else if (phase >= 2 || Math.random() < 0.15) {
    // chim hót ban ngày (hiếm ở Hồi I vì đất đã chết)
    const n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) {
      const f0 = 2200 + Math.random() * 1400;
      chirp(c, c.currentTime + k * (0.12 + Math.random() * 0.08), f0, f0 * (1.2 + Math.random() * 0.4), 0.11, 0.03);
    }
  }
  later(critterLoop, daylight < 0.4 ? 700 + Math.random() * 1600 : 2500 + Math.random() * 6000);
}

/** Lửa trại tí tách — rõ hơn về đêm */
function fireLoop() {
  const c = amb.c;
  if (!amb.running || !c || !amb.bus) return;
  const night = 1 - amb.mood.daylight;
  const pops = 1 + Math.floor(Math.random() * 3);
  for (let k = 0; k < pops; k++) {
    const t = c.currentTime + Math.random() * 0.3;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.04);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1500 + Math.random() * 2500;
    const g = c.createGain();
    g.gain.setValueAtTime(0.015 + night * 0.03, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    src.connect(f).connect(g).connect(amb.bus);
    src.start(t);
  }
  later(fireLoop, 400 + Math.random() * 1400);
}

// âm thanh vừa được mở khóa → bật nền nếu người chơi đang ở làng
if (typeof window !== "undefined") {
  onAudioUnlocked(() => {
    if (amb.wanted) start();
  });
}

/** Bật/tắt âm thanh nền (bật khi ở làng; tắt khi chiếu intro/cutscene hoặc rời làng) */
export function setAmbientActive(active: boolean) {
  amb.wanted = active;
  if (active) start();
  else stop();
}

/** Cập nhật không khí âm thanh theo hồi truyện, giờ trong ngày, số tòa rác */
export function updateAmbientMood(mood: AmbientMood) {
  amb.mood = mood;
  applyMood();
}
