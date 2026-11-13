import { create } from "zustand";
import type { HonorEntry, WorldData } from "@/lib/world-types";
import { ANONYMOUS_NAME, formatKind } from "@/lib/format";
import { playCollapse, playGift, playHammer, playPhase } from "@/lib/sfx";
import type { WorldEvent } from "@/lib/events";

export interface LogEntry {
  id: number;
  text: string;
  at: number;
}

export interface CinematicShot {
  pos: [number, number, number];
  target: [number, number, number];
  /** quay vòng chậm quanh target với bán kính/độ cao này */
  orbit?: { radius: number; height: number; speed: number };
}

let logId = 1;

/** Cộng ngay khoản ủng hộ vào Bảng Vinh Danh (server sẽ xác nhận lại sau) */
function bumpHonor(honor: HonorEntry[], payerName: string | null, amount: number): HonorEntry[] {
  const name = payerName ?? ANONYMOUS_NAME;
  const found = honor.some((h) => h.name === name);
  const next = found
    ? honor.map((h) => (h.name === name ? { ...h, total: h.total + amount, count: h.count + 1 } : h))
    : [...honor, { name, total: amount, count: 1 }];
  return next.sort((a, b) => b.total - a.total);
}
let refetchTimer: ReturnType<typeof setTimeout> | null = null;

interface WorldStore {
  world: WorldData | null;
  log: LogEntry[];
  selectedBuildingId: string | null;
  selectedChildId: string | null;
  hoveredBuildingId: string | null;
  hoveredChildId: string | null;
  openBoard: "honor" | "villain" | null;
  /** buildingId -> thời điểm bắt đầu animation sụp đổ */
  collapsing: Record<string, number>;
  /** childId -> thời điểm được cho ăn (để nhảy mừng) */
  celebrating: Record<string, number>;
  sunsetStarted: boolean;
  introDone: boolean;
  /** Điểm thế giới [x, z] mà camera cần bay tới (từ minimap) */
  focusPoint: [number, number] | null;
  /** Góc máy điện ảnh (intro / cutscene) — khóa điều khiển camera khi có */
  cinematic: CinematicShot | null;

  setFocusPoint: (p: [number, number] | null) => void;
  setCinematic: (c: CinematicShot | null) => void;
  setIntroDone: (v: boolean) => void;
  setOpenBoard: (b: "honor" | "villain" | null) => void;
  setHoveredBuilding: (id: string | null) => void;
  setHoveredChild: (id: string | null) => void;
  selectBuilding: (id: string | null) => void;
  selectChild: (id: string | null) => void;
  fetchWorld: () => Promise<void>;
  refetchSoon: () => void;
  applyEvent: (e: WorldEvent) => void;
  pushLog: (text: string) => void;
  startSunset: () => void;
}

export const useWorld = create<WorldStore>((set, get) => ({
  world: null,
  log: [],
  selectedBuildingId: null,
  selectedChildId: null,
  hoveredBuildingId: null,
  hoveredChildId: null,
  openBoard: null,
  collapsing: {},
  celebrating: {},
  sunsetStarted: false,
  introDone: false,
  focusPoint: null,
  cinematic: null,

  setFocusPoint: (p) => set({ focusPoint: p }),
  setCinematic: (c) => set({ cinematic: c }),
  setIntroDone: (v) => set({ introDone: v }),
  setOpenBoard: (b) => set({ openBoard: b, ...(b ? { selectedBuildingId: null, selectedChildId: null } : {}) }),
  setHoveredBuilding: (id) => set({ hoveredBuildingId: id }),
  setHoveredChild: (id) => set({ hoveredChildId: id }),
  selectBuilding: (id) =>
    set({
      selectedBuildingId: id,
      selectedChildId: null,
      ...(id ? { focusPoint: null, openBoard: null } : {}),
    }),
  selectChild: (id) =>
    set({
      selectedChildId: id,
      selectedBuildingId: null,
      ...(id ? { focusPoint: null, openBoard: null } : {}),
    }),

  fetchWorld: async () => {
    const res = await fetch("/api/world", { cache: "no-store" });
    if (!res.ok) return;
    const world = (await res.json()) as WorldData;
    set({ world });
  },

  /** Gộp nhiều sự kiện liên tiếp thành 1 lần tải lại (bảng vinh danh, thống kê) */
  refetchSoon: () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    refetchTimer = setTimeout(() => void get().fetchWorld(), 1500);
  },

  pushLog: (text) =>
    set((s) => ({ log: [{ id: logId++, text, at: Date.now() }, ...s.log].slice(0, 60) })),

  startSunset: () => set({ sunsetStarted: true }),

  applyEvent: (e) => {
    const { world, pushLog, refetchSoon } = get();
    if (!world) return;

    switch (e.type) {
      case "building-progress": {
        playHammer();
        set({
          world: {
            ...world,
            totalRaised: world.totalRaised + e.amount,
            totalDonations: world.totalDonations + 1,
            honor: bumpHonor(world.honor, e.payerName, e.amount),
            buildings: world.buildings.map((b) =>
              b.id === e.buildingId ? { ...b, raisedAmount: e.raisedAmount } : b
            ),
          },
        });
        const who = e.payerName ?? "Một người ẩn danh";
        pushLog(
          `⚒️ ${who} góp ${formatKind(e.amount)} phá "${e.name}" (${Math.min(
            100,
            Math.round((e.raisedAmount / e.goalAmount) * 100)
          )}%)`
        );
        refetchSoon();
        break;
      }
      case "building-destroyed": {
        playCollapse();
        set((s) => ({
          collapsing: { ...s.collapsing, [e.buildingId]: Date.now() },
          world: s.world
            ? {
                ...s.world,
                destroyedCount: e.destroyedCount,
                buildings: s.world.buildings.map((b) =>
                  b.id === e.buildingId
                    ? { ...b, status: "DESTROYED" as const, destroyedAt: new Date().toISOString() }
                    : b
                ),
              }
            : s.world,
        }));
        pushLog(`💥 "${e.name}" đã sụp đổ! Cây xanh sẽ mọc lên từ đống tro tàn. (${e.destroyedCount}/${e.total})`);
        break;
      }
      case "child-fed": {
        playGift();
        set((s) => ({
          celebrating: { ...s.celebrating, [e.childId]: Date.now() },
          world: s.world
            ? {
                ...s.world,
                totalMeals: s.world.totalMeals + 1,
                totalRaised: s.world.totalRaised + e.amount,
                honor: bumpHonor(s.world.honor, e.payerName, e.amount),
                children: s.world.children.map((c) =>
                  c.id === e.childId
                    ? { ...c, hunger: e.hunger, thirst: e.thirst, joy: e.joy, growthStage: e.growthStage }
                    : c
                ),
              }
            : s.world,
        }));
        const who = e.payerName ?? "Một người ẩn danh";
        const emoji = world.items.find((i) => i.slug === e.itemSlug)?.emoji ?? "🎁";
        pushLog(`${emoji} ${who} vừa tặng ${e.childName} ${e.itemName.toLowerCase()}!`);
        refetchSoon();
        break;
      }
      case "building-created": {
        void get().fetchWorld();
        const villain = e.contributorName ?? "Một kẻ giấu mặt";
        pushLog(`😈 ${villain} vừa dựng "${e.name}" giữa làng! Mặt đất rung chuyển...`);
        break;
      }
      case "building-removed": {
        void get().fetchWorld();
        break;
      }
      case "phase-changed": {
        setTimeout(playPhase, 3500);
        set({ world: { ...world, phase: e.phase } });
        pushLog(`🌅 Thế giới bước sang chương mới!`);
        break;
      }
      case "contribution-paid": {
        break;
      }
      case "sunset": {
        pushLog(`🌍 Tòa nhà rác cuối cùng đã sụp đổ. Thế giới mới đang mở ra...`);
        // chờ animation sụp đổ xong rồi mới chạy cutscene
        setTimeout(() => get().startSunset(), 4500);
        break;
      }
    }
  },
}));

/** Kết nối SSE — gọi một lần từ client root. */
export function connectWorldEvents() {
  const es = new EventSource("/api/events");
  es.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data) as WorldEvent;
      useWorld.getState().applyEvent(event);
    } catch {}
  };
  es.onerror = () => {
    // EventSource tự reconnect; đồng bộ lại khi nối lại
    void useWorld.getState().fetchWorld();
  };
  return es;
}
