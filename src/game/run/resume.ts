import { loadRunSnapshot } from "@/services/save";
import { restoreRunSnapshot, type RunSnapshotV1 } from "@/game/run/snapshot";

export interface LocalResume {
  sector: number;
  depth: number;
}

export const readLocalResume = (): LocalResume | null => {
  const snap = loadRunSnapshot() as RunSnapshotV1 | null;
  if (snap === null || typeof snap.run !== "object" || !snap.run.active) {
    return null;
  }
  return { sector: snap.run.sector, depth: snap.run.depthRow };
};

export const resumeLocalRun = (): boolean => {
  const snap = loadRunSnapshot();
  if (snap === null) return false;
  return restoreRunSnapshot(snap);
};
