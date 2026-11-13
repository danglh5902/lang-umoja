import { EventEmitter } from "events";

export type WorldEvent =
  | {
      type: "building-progress";
      buildingId: string;
      slug: string;
      name: string;
      raisedAmount: number;
      goalAmount: number;
      payerName: string | null;
      amount: number;
      message: string | null;
      free?: boolean;
    }
  | { type: "building-destroyed"; buildingId: string; slug: string; name: string; destroyedCount: number; total: number }
  | {
      type: "child-fed";
      childId: string;
      childName: string;
      itemSlug: string;
      itemName: string;
      payerName: string | null;
      amount: number;
      hunger: number;
      thirst: number;
      joy: number;
      growthStage: number;
    }
  | {
      type: "child-cared";
      childId: string;
      childName: string;
      kind: "water" | "fruit" | "play";
      name: string | null;
      hunger: number;
      thirst: number;
      joy: number;
    }
  | { type: "building-created"; buildingId: string; slug: string; name: string; contributorName: string | null }
  | { type: "building-removed"; buildingId: string }
  | { type: "phase-changed"; phase: number }
  | { type: "contribution-paid"; name: string }
  | { type: "sunset" };

const globalForEvents = globalThis as unknown as { worldEmitter?: EventEmitter };

export const worldEmitter =
  globalForEvents.worldEmitter ?? (globalForEvents.worldEmitter = new EventEmitter());
worldEmitter.setMaxListeners(500);

export function emitWorldEvent(event: WorldEvent) {
  worldEmitter.emit("world", event);
}
