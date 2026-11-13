// Kiểu dữ liệu phía client (JSON từ /api/world — Date đã thành string)
import type { DestructionLevel } from "./format";

export interface CrimeStats {
  waterPerDay: number;
  powerPerDay: number;
  landTaken: number;
}

export interface BuildingData {
  id: string;
  slug: string;
  name: string;
  slogan: string;
  lore: string;
  crimes: CrimeStats;
  goalAmount: number;
  raisedAmount: number;
  status: "STANDING" | "DESTROYED";
  gridX: number;
  gridY: number;
  destroyedAt: string | null;
  createdAt: string;
  source: "SEED" | "COMMUNITY";
  contributorName: string | null;
}

export interface HonorEntry {
  name: string;
  total: number;
  count: number;
}

export interface ChildData {
  id: string;
  name: string;
  backstory: string;
  hunger: number;
  thirst: number;
  joy: number;
  growthStage: number;
  totalFedAmount: number;
  gridX: number;
  gridY: number;
}

export interface ItemData {
  slug: string;
  name: string;
  emoji: string;
  price: number;
  hungerEffect: number;
  thirstEffect: number;
  joyEffect: number;
}

export interface WorldData {
  phase: number;
  sunsetAt: string | null;
  totalBuildings: number;
  destroyedCount: number;
  /** tổng nhân đạo đã góp (phá dỡ + nuôi trẻ) */
  totalRaised: number;
  /** tổng hủy diệt kẻ xấu đã tung ra */
  totalDestroy: number;
  totalDonations: number;
  totalMeals: number;
  buildings: BuildingData[];
  children: ChildData[];
  items: ItemData[];
  /** các mức hủy diệt với giá hiện hành (admin chỉnh được) */
  levels: DestructionLevel[];
  honor: HonorEntry[];
}

export const PHASE_INFO: Record<number, { act: string; name: string; tagline: string }> = {
  1: { act: "Hồi I", name: "Bụi", tagline: "Đất khô nứt dưới bóng những cỗ máy." },
  2: { act: "Hồi II", name: "Mầm", tagline: "Những mảng xanh đầu tiên đang loang ra." },
  3: { act: "Hồi III", name: "Suối", tagline: "Nước đã về. Lũ trẻ bắt đầu cười." },
  4: { act: "Hồi cuối", name: "Thế Giới Mới", tagline: "Không còn gì để phá. Chỉ còn để trồng." },
};

export const GRID_SIZE = 36;
export const TILE = 4;
/** Tâm làng (tọa độ lưới) */
export const VILLAGE_CENTER: [number, number] = [17.5, 18];

/** Chuyển tọa độ lưới (0..13) sang tọa độ thế giới 3D (x, z) */
export function gridToWorld(gx: number, gy: number): [number, number] {
  return [(gx - (GRID_SIZE - 1) / 2) * TILE, (gy - (GRID_SIZE - 1) / 2) * TILE];
}
