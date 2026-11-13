"use client";

const KEY = "umoja-donor-name";

/** Tên hiển thị trên Bảng Vinh Danh — nhớ trong trình duyệt, tự sinh nếu chưa có. */
export function getDonorName(): string {
  try {
    const saved = localStorage.getItem(KEY)?.trim();
    if (saved) return saved;
    const generated = `Người Gieo Mầm #${1000 + Math.floor(Math.random() * 9000)}`;
    localStorage.setItem(KEY, generated);
    return generated;
  } catch {
    return `Người Gieo Mầm #${1000 + Math.floor(Math.random() * 9000)}`;
  }
}

export function saveDonorName(name: string) {
  try {
    if (name.trim()) localStorage.setItem(KEY, name.trim());
  } catch {}
}
