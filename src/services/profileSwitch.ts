import { bootCloud, cancelRunCloud, dismissCloudRun } from "@/game/run/cloud";
import { readClaim } from "@/services/account-link";
import {
  bootMetaSync,
  clearMetaWatermark,
  pauseMetaSync,
  resumeMetaSync,
} from "@/services/meta-sync";
import {
  activeUid,
  adopted,
  adoptLegacyProfile,
  hasScopedValue,
  setActiveUid,
} from "@/services/profile";
import type { AccountInfo } from "@/services/uid";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import {
  createInitialMetaValues,
  META_PERSIST_KEY,
  useMetaStore,
} from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

let watching = false;
let lastUid: string | null = null;
let queue: Promise<void> = Promise.resolve();
let switches = 0;

export const profileSwitches = (): number => switches;

export const awaitProfileReady = (): Promise<void> => queue;

let syncing: { uid: string; task: Promise<void> } | null = null;

export const bootProfileSync = async (): Promise<void> => {
  const uid = activeUid();
  if (uid === null) return;
  if (syncing !== null && syncing.uid === uid) {
    await syncing.task;
    return;
  }
  const task = (async () => {
    try {
      await bootMetaSync();
      await bootCloud();
    } finally {
      if (syncing?.uid === uid) syncing = null;
    }
  })();
  syncing = { uid, task };
  await task;
};

export const switchProfile = async (uid: string): Promise<void> => {
  switches += 1;
  const hadRun = useRunStore.getState().active;
  pauseMetaSync();
  cancelRunCloud();
  dismissCloudRun();
  setActiveUid(uid);
  useBattleStore.getState().reset();
  useRunStore.getState().reset();
  if (hasScopedValue(META_PERSIST_KEY)) {
    await useMetaStore.persist.rehydrate();
  } else {
    clearMetaWatermark();
    useMetaStore.setState(createInitialMetaValues());
  }
  if (hadRun) useAppStore.getState().go("menu");
  void (async () => {
    try {
      if (readClaim() === null) await bootProfileSync();
    } finally {
      resumeMetaSync();
    }
  })();
};

const applyAccount = async (account: AccountInfo | null): Promise<void> => {
  useAppStore.getState().setAccount(account);
  const uid = account?.uid ?? null;
  if (uid === lastUid) return;
  lastUid = uid;
  if (uid === null) return;
  if (activeUid() === uid) return;
  if (activeUid() === null && !adopted()) {
    adoptLegacyProfile(uid);
    return;
  }
  await switchProfile(uid);
};

export const handleAccountChange = (account: AccountInfo | null): void => {
  queue = queue.then(() => applyAccount(account));
};

export const refreshAccount = async (): Promise<void> => {
  const { currentAccount } = await import("@/services/firebase");
  handleAccountChange(currentAccount());
  await queue;
};

export const installAuthWatch = async (): Promise<void> => {
  if (watching) return;
  watching = true;
  const { watchAuth } = await import("@/services/firebase");
  watchAuth(handleAccountChange);
};
