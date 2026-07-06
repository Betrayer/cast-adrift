import { pullCloud, pushCloud } from "@/services/cloud";
import { localSavedAt } from "@/services/save";
import {
  captureRunSnapshot,
  restoreRunSnapshot,
  type RunSnapshotV1,
} from "@/game/run/snapshot";
import { useAppStore } from "@/stores/appStore";
import { useRunStore } from "@/stores/runStore";
import type { RunSnapshot } from "@/types";

const CLOUD_DEBOUNCE = 2000;
const CLOUD_FRESHNESS = 5000;

let cloudTimer: ReturnType<typeof setTimeout> | null = null;
let pendingCloud: RunSnapshotV1 | null = null;

export const pushRunCloud = (): void => {
  if (!useRunStore.getState().active) return;
  if (cloudTimer !== null) clearTimeout(cloudTimer);
  cloudTimer = setTimeout(() => {
    cloudTimer = null;
    void (async () => {
      try {
        const { ensureAnonAuth } = await import("@/services/firebase");
        const uid = await ensureAnonAuth();
        if (uid === null) return;
        await pushCloud(
          uid,
          Date.now(),
          captureRunSnapshot() as unknown as RunSnapshot,
        );
      } catch (error) {
        console.warn("cloud: push failed", error);
      }
    })();
  }, CLOUD_DEBOUNCE);
};

export const bootCloud = async (): Promise<void> => {
  try {
    const { ensureAnonAuth } = await import("@/services/firebase");
    const uid = await ensureAnonAuth();
    if (uid === null) return;
    const cloud = await pullCloud(uid);
    if (cloud === null) return;
    const local = localSavedAt();
    if (local === null || cloud.savedAt > local + CLOUD_FRESHNESS) {
      pendingCloud = cloud.payload as unknown as RunSnapshotV1;
      useAppStore.getState().setCloudResume(true);
    }
  } catch (error) {
    console.warn("cloud: boot pull failed", error);
  }
};

export const restoreCloudRun = (): boolean => {
  if (pendingCloud === null) return false;
  const ok = restoreRunSnapshot(pendingCloud);
  pendingCloud = null;
  useAppStore.getState().setCloudResume(false);
  return ok;
};

export const dismissCloudRun = (): void => {
  pendingCloud = null;
  useAppStore.getState().setCloudResume(false);
};
