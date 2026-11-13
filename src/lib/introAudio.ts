"use client";

/**
 * Âm thanh dẫn truyện tổng hợp bằng Web Audio (không cần file nhạc).
 * Phải được khởi động từ một thao tác người dùng (click) vì chính sách autoplay của trình duyệt.
 */
class IntroAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private droneNodes: AudioScheduledSourceNode[] = [];
  muted = false;

  start() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.9;
      this.master.connect(this.ctx.destination);
      this.drone();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.2);
  }

  /** Tiếng ù trầm huyền bí kéo dài */
  private drone() {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 4);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    filter.Q.value = 6;
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(filter.frequency);
    for (const f of [55, 55.6, 82.4]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.connect(filter);
      o.start();
      this.droneNodes.push(o);
    }
    filter.connect(out).connect(this.master!);
    lfo.start();
    this.droneNodes.push(lfo);
  }

  private noiseBuffer(seconds: number) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Tiếng nổ trầm + rung đất (khi các tòa nhà xuất hiện) */
  boom() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(28, t + 1.4);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 2);

    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer(2);
    const nf = ctx.createBiquadFilter();
    nf.type = "lowpass";
    nf.frequency.value = 400;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
    n.connect(nf).connect(ng).connect(this.master!);
    n.start(t);
  }

  /** Tiếng rít điện tử như quạt server */
  whine() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.setValueAtTime(1800, t);
    o.frequency.linearRampToValueAtTime(2600, t + 2.5);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.025, t + 0.6);
    g.gain.linearRampToValueAtTime(0, t + 3);
    o.connect(g).connect(this.master!);
    o.start(t);
    o.stop(t + 3.1);
  }

  /** Nhịp tim chậm (cơn khát) */
  heartbeat(beats = 4) {
    const ctx = this.ctx;
    if (!ctx) return;
    for (let i = 0; i < beats; i++) {
      for (const [dt, vol] of [
        [0, 0.7],
        [0.22, 0.45],
      ]) {
        const t = ctx.currentTime + i * 1.15 + dt;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(62, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.18);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        o.connect(g).connect(this.master!);
        o.start(t);
        o.stop(t + 0.3);
      }
    }
  }

  /** Chuông ngân huyền bí (lời tiên tri) */
  chime() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [523.25, 783.99, 1046.5, 1318.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const st = t + i * 0.35;
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.12, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 4);
      o.connect(g).connect(this.master!);
      o.start(st);
      o.stop(st + 4.2);
    });
  }

  /** Hợp âm sáng dần (bình minh, sứ mệnh) */
  rise() {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    [261.63, 329.63, 392, 523.25].forEach((f) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 2.5);
      g.gain.linearRampToValueAtTime(0, t + 7);
      o.connect(g).connect(this.master!);
      o.start(t);
      o.stop(t + 7.2);
    });
  }

  stop() {
    const ctx = this.ctx;
    if (!ctx) return;
    this.master?.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    setTimeout(() => {
      this.droneNodes.forEach((n) => {
        try {
          n.stop();
        } catch {}
      });
      void ctx.close();
    }, 2500);
    this.ctx = null;
    this.droneNodes = [];
  }
}

export const introAudio = new IntroAudio();
