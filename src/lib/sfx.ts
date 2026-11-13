"use client";

/**
 * Hiệu ứng âm thanh của làng, tổng hợp bằng Web Audio (không cần file).
 * Trình duyệt chỉ cho phát âm thanh sau lần chạm/click đầu tiên của người xem,
 * nên AudioContext được "mở khóa" ở thao tác đầu tiên trên trang.
 */

const MUTE_KEY = "umoja-sfx-muted";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
const listeners = new Set<(m: boolean) => void>();

try {
  muted = typeof window !== "undefined" && localStorage.getItem(MUTE_KEY) === "1";
} catch {}

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const unlockCallbacks = new Set<() => void>();

/** Đăng ký việc cần làm khi âm thanh vừa được mở khóa (vd: bật âm thanh nền) */
export function onAudioUnlocked(fn: () => void) {
  unlockCallbacks.add(fn);
  return () => {
    unlockCallbacks.delete(fn);
  };
}

/** AudioContext + đầu ra chung (đã qua nút tắt tiếng) cho các module âm thanh khác */
export function audioOut(): { c: AudioContext; out: GainNode } | null {
  const c = ensureCtx();
  if (!c || c.state !== "running" || !master) return null;
  return { c, out: master };
}

/** Mở khóa âm thanh ở thao tác đầu tiên của người xem */
export function installSfxUnlock() {
  if (typeof window === "undefined") return;
  const unlock = () => {
    const c = ensureCtx();
    const done = () => unlockCallbacks.forEach((fn) => fn());
    if (c && c.state !== "running") void c.resume().then(done);
    else done();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function isSfxMuted() {
  return muted;
}

export function setSfxMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem(MUTE_KEY, m ? "1" : "0");
  } catch {}
  if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05);
  listeners.forEach((fn) => fn(m));
}

export function onSfxMutedChange(fn: (m: boolean) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/* ---------------- khối dựng âm ---------------- */

function ready() {
  if (muted) return null;
  const c = ensureCtx();
  if (!c || c.state !== "running" || !master) return null;
  return c;
}

export function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function tone(
  c: AudioContext,
  { freq, type = "sine", start = 0, dur = 0.3, vol = 0.3, endFreq }: {
    freq: number;
    type?: OscillatorType;
    start?: number;
    dur?: number;
    vol?: number;
    endFreq?: number;
  }
) {
  const t = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master!);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(
  c: AudioContext,
  { start = 0, dur = 0.3, vol = 0.3, filter = "lowpass", freq = 800, endFreq, q = 1 }: {
    start?: number;
    dur?: number;
    vol?: number;
    filter?: BiquadFilterType;
    freq?: number;
    endFreq?: number;
    q?: number;
  }
) {
  const t = c.currentTime + start;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur + 0.1);
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + dur + 0.1);
}

/* ---------------- âm thanh sự kiện ---------------- */

/** 🍞 Tặng quà cho bé: chuông leng keng vui tươi + lấp lánh */
export function playGift() {
  const c = ready();
  if (!c) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    tone(c, { freq: f, type: "triangle", start: i * 0.09, dur: 0.55, vol: 0.22 })
  );
  [2093, 2637, 3136].forEach((f, i) => tone(c, { freq: f, start: 0.36 + i * 0.06, dur: 0.35, vol: 0.06 }));
  noise(c, { start: 0.36, dur: 0.4, vol: 0.05, filter: "highpass", freq: 6000 });
}

/** ⚒️ Góp búa phá dỡ: hai nhát búa gõ vào bê tông/kim loại */
export function playHammer() {
  const c = ready();
  if (!c) return;
  for (const s of [0, 0.22]) {
    noise(c, { start: s, dur: 0.12, vol: 0.45, filter: "bandpass", freq: 2400, q: 3 });
    tone(c, { freq: 190, start: s, dur: 0.18, vol: 0.4, endFreq: 70 });
    tone(c, { freq: 1460, type: "square", start: s, dur: 0.25, vol: 0.03 });
    tone(c, { freq: 2210, start: s, dur: 0.4, vol: 0.05 });
  }
}

/** 💥 Tòa nhà sụp đổ: rung chuyển, đổ vỡ, bụi... rồi chim hót khi cây mọc */
export function playCollapse() {
  const c = ready();
  if (!c) return;
  // nổ trầm + rung đất kéo dài
  tone(c, { freq: 85, start: 0, dur: 2.2, vol: 0.6, endFreq: 30 });
  noise(c, { start: 0, dur: 3, vol: 0.5, filter: "lowpass", freq: 900, endFreq: 120 });
  // tiếng bê tông, kính vỡ rơi lộp bộp
  for (let i = 0; i < 14; i++) {
    const s = 0.15 + Math.random() * 2.2;
    noise(c, { start: s, dur: 0.08 + Math.random() * 0.12, vol: 0.12 + Math.random() * 0.15, filter: "bandpass", freq: 600 + Math.random() * 3000, q: 2 });
  }
  // kim loại cong vênh
  tone(c, { freq: 420, type: "sawtooth", start: 0.4, dur: 1.4, vol: 0.04, endFreq: 140 });
  // sự sống trở lại: chim hót
  for (let i = 0; i < 5; i++) {
    const s = 3.3 + i * 0.28 + Math.random() * 0.1;
    tone(c, { freq: 2600 + Math.random() * 600, start: s, dur: 0.12, vol: 0.07, endFreq: 3800 + Math.random() * 500 });
  }
  [392, 493.88, 587.33].forEach((f, i) => tone(c, { freq: f, type: "triangle", start: 3.2 + i * 0.12, dur: 1.4, vol: 0.08 }));
}

/** 😈 Kẻ xấu dựng tòa mới: đất rung, máy móc rít lên, hợp âm u ám */
export function playBuild() {
  const c = ready();
  if (!c) return;
  // đất trồi lên
  noise(c, { start: 0, dur: 2.6, vol: 0.4, filter: "lowpass", freq: 120, endFreq: 500 });
  tone(c, { freq: 40, start: 0, dur: 2.6, vol: 0.5, endFreq: 75 });
  // tiếng búa máy, khung thép lắp ráp
  for (let i = 0; i < 6; i++) {
    const s = 0.4 + i * 0.32;
    noise(c, { start: s, dur: 0.07, vol: 0.25, filter: "bandpass", freq: 3200, q: 6 });
    tone(c, { freq: 960 + (i % 2) * 180, type: "square", start: s, dur: 0.12, vol: 0.025 });
  }
  // quạt server rít lên
  tone(c, { freq: 1200, type: "sawtooth", start: 1.2, dur: 1.8, vol: 0.025, endFreq: 2400 });
  // hợp âm thứ u ám
  [110, 130.81, 155.56].forEach((f) => tone(c, { freq: f, type: "sawtooth", start: 2.1, dur: 2.2, vol: 0.06 }));
}

/** 🌅 Thế giới sang chương mới */
export function playPhase() {
  const c = ready();
  if (!c) return;
  [261.63, 329.63, 392, 523.25, 659.25].forEach((f, i) =>
    tone(c, { freq: f, type: "triangle", start: i * 0.15, dur: 2.2, vol: 0.1 })
  );
}
