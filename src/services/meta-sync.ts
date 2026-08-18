import { boundedTask } from "@/services/bounded";
import { now } from "@/services/clock";
import {
  firestoreMetaDocs,
  META_DOC_V,
  readMetaDocFor,
  type MetaDoc,
} from "@/services/metaDoc";
import {
  activeUid,
  deviceStorage,
  hasScopedValue,
  scopedKey,
} from "@/services/profile";
import {
  META_PERSIST_KEY,
  META_VERSION,
  migrateMeta,
  useMetaStore,
  type MetaValues,
} from "@/stores/metaStore";
import { useSettingsStore } from "@/stores/settingsStore";

const DEBOUNCE = 3000;
const PUSH_TIMEOUT = 5000;

let installed = false;
let applyingRemote = false;
let paused = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const localAtKey = (): string => scopedKey("meta.at");

export const localMetaAt = (): number => {
  const raw = deviceStorage.getItem(localAtKey());
  return raw !== null ? Number(raw) : 0;
};

export const trustedMetaAt = (): number =>
  hasScopedValue(META_PERSIST_KEY) ? localMetaAt() : 0;

export const clearMetaWatermark = (): void => {
  deviceStorage.removeItem(localAtKey());
};

const setLocalAt = (at: number): void => {
  deviceStorage.setItem(localAtKey(), String(at));
};

const metaValues = (): MetaValues => {
  const s = useMetaStore.getState();
  return {
    shards: s.shards,
    xp: s.xp,
    level: s.level,
    chartPicks: s.chartPicks,
    collection: s.collection,
    ships: s.ships,
    selectedShip: s.selectedShip,
    hangar: s.hangar,
    themes: s.themes,
    tutorialSeen: s.tutorialSeen,
    engravings: s.engravings,
    badges: s.badges,
    codex: s.codex,
    codexRead: s.codexRead,
    seenPuzzles: s.seenPuzzles,
    seenFragments: s.seenFragments,
    contracts: s.contracts,
    dailyPlayed: s.dailyPlayed,
    best: s.best,
    ascension: s.ascension,
    flagsArchive: s.flagsArchive,
    bossFirstKills: s.bossFirstKills,
    endings: s.endings,
    achievements: s.achievements,
    achievementsSeen: s.achievementsSeen,
    encountered: s.encountered,
    unlocksGranted: s.unlocksGranted,
    unlocksSeen: s.unlocksSeen,
    dieSkin: s.dieSkin,
    prefs: s.prefs,
    stats: s.stats,
  };
};

export const metaDocSnapshot = (): MetaDoc => {
  const at = localMetaAt();
  return {
    v: META_DOC_V,
    updatedAt: at > 0 ? at : now(),
    data: JSON.stringify(metaValues()),
  };
};

const adoptPrefs = (): void => {
  const { prefs } = useMetaStore.getState();
  const settings = useSettingsStore.getState();
  if (prefs.battleLayout !== undefined) {
    settings.setBattleLayout(prefs.battleLayout);
  }
  if (prefs.theme !== undefined) settings.setTheme(prefs.theme);
};

export const applyMetaDoc = (doc: MetaDoc): boolean => {
  try {
    const parsed = JSON.parse(doc.data) as unknown;
    applyingRemote = true;
    useMetaStore.setState(migrateMeta(parsed, META_VERSION));
    applyingRemote = false;
    adoptPrefs();
    setLocalAt(doc.updatedAt);
    return true;
  } catch (error) {
    applyingRemote = false;
    console.warn("meta-sync: could not apply a meta document", error);
    return false;
  }
};

const syncUid = async (): Promise<string | null> => {
  const uid = activeUid();
  if (uid === null) return null;
  const { currentAccount } = await import("@/services/firebase");
  return currentAccount()?.uid === uid ? uid : null;
};

const pushMeta = async (): Promise<void> => {
  try {
    const uid = await syncUid();
    if (uid === null) return;
    const at = now();
    await firestoreMetaDocs.write(uid, {
      v: META_DOC_V,
      updatedAt: at,
      data: JSON.stringify(metaValues()),
    });
    if (activeUid() !== uid) return;
    setLocalAt(at);
  } catch (error) {
    console.warn("meta-sync: push failed", error);
  }
};

const cancelPending = (): void => {
  if (timer === null) return;
  clearTimeout(timer);
  timer = null;
};

const schedulePush = (): void => {
  cancelPending();
  timer = setTimeout(() => {
    timer = null;
    void pushMeta();
  }, DEBOUNCE);
};

export const flushMetaSync = async (): Promise<void> => {
  cancelPending();
  await boundedTask(pushMeta(), PUSH_TIMEOUT, undefined);
};

export const pauseMetaSync = (): void => {
  paused = true;
  cancelPending();
};

export const resumeMetaSync = (): void => {
  paused = false;
};

export const setupMetaSync = (): void => {
  if (installed) return;
  installed = true;
  useMetaStore.subscribe(() => {
    if (applyingRemote || paused) return;
    schedulePush();
  });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) void flushMetaSync();
    });
  }
};

export const bootMetaSync = async (): Promise<void> => {
  try {
    const uid = await syncUid();
    if (uid === null) return;
    const cloud = await readMetaDocFor(uid);
    if (activeUid() !== uid) return;
    if (cloud === null) {
      await pushMeta();
      return;
    }
    if (cloud.updatedAt > trustedMetaAt()) {
      if (applyMetaDoc(cloud) && import.meta.env.DEV) {
        console.info("meta-sync: pulled cloud meta");
      }
      return;
    }
    await pushMeta();
  } catch (error) {
    console.warn("meta-sync: boot failed", error);
  }
};
