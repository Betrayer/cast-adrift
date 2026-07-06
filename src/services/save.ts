import { fnv1a } from '@/services/rng';
import type { RunSnapshot } from '@/types';

export interface KeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export type RunMigration = (data: unknown) => unknown;

export const RUN_SAVE_V = 1;

const KEY_A = 'ca.run.a';
const KEY_B = 'ca.run.b';
const KEY_PTR = 'ca.run.ptr';

interface SavePayload {
  v: number;
  savedAt: number;
  checksum: number;
  data: string;
}

export interface SaveService {
  saveRunSnapshot: (snapshot: RunSnapshot) => void;
  loadRunSnapshot: () => RunSnapshot | null;
  localSavedAt: () => number | null;
  hasRun: () => boolean;
  clearRun: () => void;
  pushCloudSnapshot: () => Promise<void>;
  pullCloudSnapshot: () => Promise<RunSnapshot | null>;
}

export const createMemoryStorage = (): KeyValueStorage => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
};

const runMigrations: Partial<Record<number, RunMigration>> = {};

export const createSaveService = (
  storage: KeyValueStorage,
  migrations: Partial<Record<number, RunMigration>> = runMigrations,
): SaveService => {
  const readPayload = (key: string): SavePayload | null => {
    const raw = storage.getItem(key);
    if (raw === null) return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (typeof parsed !== 'object' || parsed === null) return null;
    const payload = parsed as Partial<SavePayload>;
    if (
      typeof payload.v !== 'number' ||
      typeof payload.savedAt !== 'number' ||
      typeof payload.checksum !== 'number' ||
      typeof payload.data !== 'string'
    ) {
      return null;
    }
    if (fnv1a(payload.data) !== payload.checksum) return null;
    return payload as SavePayload;
  };

  const migrate = (payload: SavePayload): RunSnapshot | null => {
    let data: unknown;
    try {
      data = JSON.parse(payload.data);
    } catch {
      return null;
    }
    let version = payload.v;
    if (version > RUN_SAVE_V) return null;
    while (version < RUN_SAVE_V) {
      const step = migrations[version];
      if (step === undefined) return null;
      try {
        data = step(data);
      } catch {
        return null;
      }
      version += 1;
    }
    return data as RunSnapshot;
  };

  const activeKey = (): string =>
    storage.getItem(KEY_PTR) === 'b' ? KEY_B : KEY_A;

  const inactiveKey = (): string => (activeKey() === KEY_A ? KEY_B : KEY_A);

  const saveRunSnapshot = (snapshot: RunSnapshot): void => {
    const data = JSON.stringify(snapshot);
    const payload: SavePayload = {
      v: RUN_SAVE_V,
      savedAt: Date.now(),
      checksum: fnv1a(data),
      data,
    };
    const target = inactiveKey();
    storage.setItem(target, JSON.stringify(payload));
    const verified = readPayload(target);
    if (verified === null || verified.data !== data) {
      throw new Error('save: write verification failed, pointer not flipped');
    }
    storage.setItem(KEY_PTR, target === KEY_B ? 'b' : 'a');
  };

  const loadRunSnapshot = (): RunSnapshot | null => {
    for (const key of [activeKey(), inactiveKey()]) {
      const payload = readPayload(key);
      if (payload === null) continue;
      const snapshot = migrate(payload);
      if (snapshot !== null) return snapshot;
    }
    return null;
  };

  const localSavedAt = (): number | null => {
    for (const key of [activeKey(), inactiveKey()]) {
      const payload = readPayload(key);
      if (payload !== null) return payload.savedAt;
    }
    return null;
  };

  const hasRun = (): boolean => loadRunSnapshot() !== null;

  const clearRun = (): void => {
    storage.removeItem(KEY_A);
    storage.removeItem(KEY_B);
    storage.removeItem(KEY_PTR);
  };

  const pushCloudSnapshot = (): Promise<void> => Promise.resolve();

  const pullCloudSnapshot = (): Promise<RunSnapshot | null> =>
    Promise.resolve(null);

  return {
    saveRunSnapshot,
    loadRunSnapshot,
    localSavedAt,
    hasRun,
    clearRun,
    pushCloudSnapshot,
    pullCloudSnapshot,
  };
};

const defaultStorage: KeyValueStorage =
  typeof localStorage === 'undefined' ? createMemoryStorage() : localStorage;

export const {
  saveRunSnapshot,
  loadRunSnapshot,
  localSavedAt,
  hasRun,
  clearRun,
  pushCloudSnapshot,
  pullCloudSnapshot,
} = createSaveService(defaultStorage);
