"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

function cssVar(name: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export const bodyFont = () => cssVar("--font-be-vietnam", "system-ui, sans-serif");
export const displayFont = () => cssVar("--font-playfair", "Georgia, serif");

/** Chờ font Tiếng Việt tải xong trước khi vẽ chữ lên canvas (tránh rơi về font hệ thống) */
export function useFontsReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const sample = "ẮẰẲẴẶẤẦẨẪẬđơưỚỜỞỠỢ";
    Promise.all([
      document.fonts.load(`700 48px ${bodyFont()}`, sample),
      document.fonts.load(`800 48px ${bodyFont()}`, sample),
      document.fonts.load(`900 48px ${displayFont()}`, sample),
      document.fonts.ready,
    ])
      .catch(() => {})
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready;
}

/** Thu nhỏ cỡ chữ cho vừa chiều rộng */
function fitFont(ctx: CanvasRenderingContext2D, text: string, weight: number, family: string, start: number, maxW: number) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxW && size > 14) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function toTexture(canvas: HTMLCanvasElement) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function woodBackground(ctx: CanvasRenderingContext2D, w: number, h: number, dark = false) {
  const base = dark ? ["#3a2418", "#2c1a11"] : ["#8a5a32", "#6e4524"];
  const plankH = h / 6;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = base[i % 2];
    ctx.fillRect(0, i * plankH, w, plankH);
    // vân gỗ
    ctx.strokeStyle = dark ? "rgba(0,0,0,0.25)" : "rgba(60,30,10,0.25)";
    ctx.lineWidth = 2;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      const y = i * plankH + plankH * (0.2 + k * 0.2);
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 40) ctx.lineTo(x, y + Math.sin((x + i * 77 + k * 31) * 0.02) * 4);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, (i + 1) * plankH - 3, w, 3);
  }
  // viền
  ctx.strokeStyle = dark ? "#1a0f0a" : "#4a2c14";
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, w - 18, h - 18);
  // đinh
  ctx.fillStyle = "#c9c2b5";
  for (const [x, y] of [
    [30, 30],
    [w - 30, 30],
    [30, h - 30],
    [w - 30, h - 30],
  ]) {
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Biển hiệu trước cổng tòa nhà rác */
export function makeBuildingSignTexture(name: string, subline: string, villain: boolean) {
  const w = 1024;
  const h = 320;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const body = bodyFont();

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, villain ? "#2b0d10" : "#1d1f26");
  g.addColorStop(1, villain ? "#160507" : "#0f1015");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = villain ? "#ff3b3b" : "#ffb703";
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = fitFont(ctx, name, 800, body, 112, w - 100);
  ctx.shadowColor = villain ? "rgba(255,60,60,0.9)" : "rgba(255,190,80,0.8)";
  ctx.shadowBlur = 24;
  ctx.fillStyle = "#fff4e6";
  ctx.fillText(name, w / 2, h * 0.42 + (112 - size) * 0.1);
  ctx.shadowBlur = 0;

  ctx.font = `500 40px ${body}`;
  ctx.fillStyle = villain ? "#ff9a8f" : "#c9c2b0";
  ctx.fillText(ellipsize(ctx, subline, w - 120), w / 2, h * 0.78);
  return toTexture(c);
}

export interface BoardRow {
  left: string;
  right: string;
  dim?: boolean;
}

/** Bảng gỗ giữa làng: Vinh danh / Kẻ xấu */
export function makeBoardTexture(kind: "honor" | "villain", rows: BoardRow[], footer: string) {
  const w = 1024;
  const h = 768;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  const body = bodyFont();
  const display = displayFont();
  woodBackground(ctx, w, h, kind === "villain");

  // tiêu đề
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 76px ${display}`;
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = kind === "honor" ? "#ffe08a" : "#ff6b5b";
  ctx.fillText(kind === "honor" ? "BẢNG VINH DANH" : "BẢNG KẺ XẤU", w / 2, 92);
  ctx.shadowBlur = 0;
  ctx.font = `500 30px ${body}`;
  ctx.fillStyle = kind === "honor" ? "#f5e6c8" : "#e8b4ac";
  ctx.fillText(
    kind === "honor" ? "Những Người Gieo Mầm đã cứu làng" : "Những tòa nhà rác & thời gian chúng tồn tại",
    w / 2,
    152
  );

  // dòng kẻ
  ctx.strokeStyle = "rgba(255,230,180,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 185);
  ctx.lineTo(w - 80, 185);
  ctx.stroke();

  const max = 7;
  const lineH = 66;
  if (rows.length === 0) {
    ctx.font = `italic 500 36px ${body}`;
    ctx.fillStyle = "rgba(255,240,210,0.7)";
    ctx.fillText(kind === "honor" ? "Chưa có ai... Hãy là người đầu tiên!" : "Không còn kẻ xấu nào. 🌳", w / 2, 360);
  }
  rows.slice(0, max).forEach((r, i) => {
    const y = 232 + i * lineH;
    ctx.textBaseline = "middle";
    ctx.globalAlpha = r.dim ? 0.55 : 1;
    // hạng
    ctx.textAlign = "left";
    ctx.font = `800 36px ${body}`;
    ctx.fillStyle = kind === "honor" ? (i === 0 ? "#ffd166" : i === 1 ? "#e5e5e5" : i === 2 ? "#e0a96d" : "#f1e2c6") : "#ffb3a8";
    const rank = kind === "honor" ? `${i + 1}.` : r.dim ? "🌳" : "🏭";
    ctx.fillText(rank, 80, y);
    // tên
    ctx.font = `700 38px ${body}`;
    ctx.fillStyle = "#fff6e6";
    ctx.fillText(ellipsize(ctx, r.left, 450), 150, y);
    // giá trị
    ctx.textAlign = "right";
    ctx.font = `600 34px ${body}`;
    ctx.fillStyle = kind === "honor" ? "#ffe08a" : "#ffc2b8";
    ctx.fillText(r.right, w - 80, y);
    ctx.globalAlpha = 1;
  });

  ctx.textAlign = "center";
  ctx.font = `italic 500 28px ${body}`;
  ctx.fillStyle = "rgba(255,240,210,0.75)";
  ctx.fillText(footer, w / 2, h - 58);
  return toTexture(c);
}
