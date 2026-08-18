import { deleteCloud, pullCloud, pushCloud } from "@/services/cloud";
import { activeUid } from "@/services/profile";
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

const syncUid = async (): Promise<string | null> => {
  const uid = activeUid();
  if (uid === null) return null;
  const { currentAccount } = await import("@/services/firebase");
  return currentAccount()?.uid === uid ? uid : null;
};

const clearTimer = (): void => {
  if (cloudTimer === null) return;
  clearTimeout(cloudTimer);
  cloudTimer = null;
};

const writeCloud = async (): Promise<void> => {
  try {
    const uid = await syncUid();
    if (uid === null) return;
    await pushCloud(
      uid,
      Date.now(),
      captureRunSnapshot() as unknown as RunSnapshot,
    );
  } catch (error) {
    console.warn("cloud: push failed", error);
  }
};

export const pushRunCloud = (): void => {
  if (!useRunStore.getState().active) return;
  clearTimer();
  cloudTimer = setTimeout(() => {
    cloudTimer = null;
    void writeCloud();
  }, CLOUD_DEBOUNCE);
};

export const cancelRunCloud = (): void => {
  clearTimer();
};

export const bootCloud = async (): Promise<void> => {
  try {
    const uid = await syncUid();
    if (uid === null) return;
    const cloud = await pullCloud(uid);
    if (activeUid() !== uid) return;
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

export const dropCloudRun = async (): Promise<void> => {
  clearTimer();
  pendingCloud = null;
  useAppStore.getState().setCloudResume(false);
  try {
    const uid = await syncUid();
    if (uid === null) return;
    await deleteCloud(uid);
  } catch (error) {
    console.warn("cloud: delete failed", error);
  }
};

export const dismissCloudRun = (): void => {
  pendingCloud = null;
  useAppStore.getState().setCloudResume(false);
};
