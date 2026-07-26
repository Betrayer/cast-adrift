import {
  META_VERSION,
  migrateMeta,
  useMetaStore,
  type MetaValues,
} from "@/stores/metaStore";

const DEBOUNCE = 3000;
const META_DOC_V = 1;
const LOCAL_AT_KEY = "ca.meta.at";

let installed = false;
let applyingRemote = false;
let timer: ReturnType<typeof setTimeout> | null = null;

const localAt = (): number => {
  try {
    const raw = localStorage.getItem(LOCAL_AT_KEY);
    return raw !== null ? Number(raw) : 0;
  } catch {
    return 0;
  }
};

const setLocalAt = (at: number): void => {
  try {
    localStorage.setItem(LOCAL_AT_KEY, String(at));
  } catch {
    /* storage unavailable */
  }
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
    codex: s.codex,
    codexRead: s.codexRead,
    contracts: s.contracts,
    ascension: s.ascension,
    flagsArchive: s.flagsArchive,
    stats: s.stats,
  };
};

const pushMeta = async (): Promise<void> => {
  try {
    const { ensureAnonAuth, db } = await import("@/services/firebase");
    const uid = await ensureAnonAuth();
    if (uid === null) return;
    const { doc, setDoc } = await import("firebase/firestore");
    const at = Date.now();
    await setDoc(doc(db(), "users", uid, "meta", "progress"), {
      v: META_DOC_V,
      updatedAt: at,
      data: JSON.stringify(metaValues()),
    });
    setLocalAt(at);
  } catch (error) {
    console.warn("meta-sync: push failed", error);
  }
};

const schedulePush = (): void => {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void pushMeta();
  }, DEBOUNCE);
};

export const flushMetaSync = (): void => {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  void pushMeta();
};

export const setupMetaSync = (): void => {
  if (installed) return;
  installed = true;
  useMetaStore.subscribe(() => {
    if (applyingRemote) return;
    schedulePush();
  });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) flushMetaSync();
    });
  }
};

export const bootMetaSync = async (): Promise<void> => {
  try {
    const { ensureAnonAuth, db } = await import("@/services/firebase");
    const uid = await ensureAnonAuth();
    if (uid === null) return;
    const { doc, getDoc } = await import("firebase/firestore");
    const snapshot = await getDoc(doc(db(), "users", uid, "meta", "progress"));
    if (!snapshot.exists()) {
      void pushMeta();
      return;
    }
    const data = snapshot.data();
    const cloudAt = typeof data.updatedAt === "number" ? data.updatedAt : 0;
    if (cloudAt > localAt() && typeof data.data === "string") {
      const parsed = JSON.parse(data.data) as unknown;
      applyingRemote = true;
      useMetaStore.setState(migrateMeta(parsed, META_VERSION));
      applyingRemote = false;
      setLocalAt(cloudAt);
      if (import.meta.env.DEV) console.info("meta-sync: pulled cloud meta");
    } else {
      void pushMeta();
    }
  } catch (error) {
    console.warn("meta-sync: boot failed", error);
  }
};
