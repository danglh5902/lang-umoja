import * as THREE from "three";

/** Hash xác định (deterministic) 0..1 */
export function hash2(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Value noise 2D mượt, 0..1 */
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Fractal noise (2 octave) 0..1 */
export function fbm2(x: number, y: number): number {
  return noise2(x, y) * 0.65 + noise2(x * 2.7 + 13.1, y * 2.7 + 7.7) * 0.35;
}

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Texture mặt tiền tòa nhà: bê tông ố + lưới cửa sổ, một phần sáng đèn.
 * Dùng chung làm map + emissiveMap (cửa sổ sáng tự phát quang).
 */
export function makeBuildingTexture(seed: number, floors: number, tint: string) {
  const w = 128;
  const hPerFloor = 28;
  const h = Math.max(hPerFloor * floors, 84);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  const rand = seededRand(seed * 7919 + 17);

  // nền bê tông
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, w, h);
  // vết ố loang
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${20 + rand() * 30},${20 + rand() * 30},${20 + rand() * 30},${0.05 + rand() * 0.08})`;
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillRect(x, y, 6 + rand() * 30, 10 + rand() * 60);
  }
  // vệt nước chảy từ nóc
  for (let i = 0; i < 6; i++) {
    const x = rand() * w;
    ctx.fillStyle = `rgba(30,30,32,${0.1 + rand() * 0.1})`;
    ctx.fillRect(x, 0, 2 + rand() * 3, h * (0.3 + rand() * 0.7));
  }

  // cửa sổ
  const cols = 4;
  const cw = w / cols;
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.18;
      const y = f * hPerFloor + hPerFloor * 0.2;
      const ww = cw * 0.64;
      const wh = hPerFloor * 0.55;
      const r = rand();
      if (r < 0.22) {
        // cửa sổ sáng đèn (màu ấm — emissive sẽ làm nó phát sáng)
        ctx.fillStyle = "#ffd99a";
      } else if (r < 0.3) {
        // đèn server xanh lạnh
        ctx.fillStyle = "#9ef2cf";
      } else {
        // kính tối (biến thiên theo r, không tốn thêm lượt random)
        const d = Math.floor((r - 0.3) * 20);
        ctx.fillStyle = `rgb(${16 + d},${24 + d},${32 + d})`;
      }
      ctx.fillRect(x, y, ww, wh);
      // khung
      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.strokeRect(x, y, ww, wh);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;

  // emissive map: chỉ giữ cửa sổ sáng
  const ec = document.createElement("canvas");
  ec.width = w;
  ec.height = h;
  const ectx = ec.getContext("2d")!;
  ectx.fillStyle = "#000";
  ectx.fillRect(0, 0, w, h);
  const rand2 = seededRand(seed * 7919 + 17);
  for (let i = 0; i < 40 * 8 + 6 * 4; i++) rand2(); // bỏ qua đúng số lượt random của vết ố + vệt nước
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw * 0.18;
      const y = f * hPerFloor + hPerFloor * 0.2;
      const ww = cw * 0.64;
      const wh = hPerFloor * 0.55;
      const r = rand2();
      if (r < 0.22) ectx.fillStyle = "#ffbe66";
      else if (r < 0.3) ectx.fillStyle = "#53e6ae";
      else continue;
      ectx.fillRect(x, y, ww, wh);
    }
  }
  const emissive = new THREE.CanvasTexture(ec);
  emissive.colorSpace = THREE.SRGBColorSpace;

  return { map: tex, emissiveMap: emissive };
}
