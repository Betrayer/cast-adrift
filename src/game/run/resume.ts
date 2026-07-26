import { loadRunSnapshot, localSavedAt } from "@/services/save";
import { restoreRunSnapshot, type RunSnapshotV1 } from "@/game/run/snapshot";

import type { ShipId } from "@/data/ships";

export interface LocalResume {
  sector: number;
  depth: number;
  shipId: ShipId;
  savedAt: number | null;
}

export const readLocalResume = (): LocalResume | null => {
  const snap = loadRunSnapshot() as RunSnapshotV1 | null;
  if (snap === null || typeof snap.run !== "object" || !snap.run.active) {
    return null;
  }
  return {
    sector: snap.run.sector,
    depth: snap.run.depthRow,
    shipId: snap.run.shipId,
    savedAt: localSavedAt(),
  };
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export type RelativeWhen =
  | { unit: "now" }
  | { unit: "minutes" | "hours" | "days"; n: number };

// Relative timestamp for the menu resume card. The caller localises the unit.
export const relativeWhen = (
  savedAt: number | null,
  now = Date.now(),
): RelativeWhen => {
  if (savedAt === null) return { unit: "now" };
  const delta = Math.max(0, now - savedAt);
  if (delta < MINUTE) return { unit: "now" };
  if (delta < HOUR) return { unit: "minutes", n: Math.floor(delta / MINUTE) };
  if (delta < DAY) return { unit: "hours", n: Math.floor(delta / HOUR) };
  return { unit: "days", n: Math.floor(delta / DAY) };
};

export const resumeLocalRun = (): boolean => {
  const snap = loadRunSnapshot();
  if (snap === null) return false;
  return restoreRunSnapshot(snap);
};
