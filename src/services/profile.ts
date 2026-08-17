export interface KeyValueStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
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

const guarded = (storage: KeyValueStorage): KeyValueStorage => ({
  getItem: (key) => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      storage.setItem(key, value);
    } catch {}
  },
  removeItem: (key) => {
    try {
      storage.removeItem(key);
    } catch {}
  },
});

export const ACTIVE_UID_KEY = "ca.uid";
export const ADOPTED_KEY = "ca.adopted";
const LEGACY_LINK_KEY = "ca.link.at";

export const SCOPED_SUFFIXES = [
  "meta",
  "meta.at",
  "run.a",
  "run.b",
  "run.ptr",
] as const;

export interface ProfileNamespace {
  activeUid: () => string | null;
  setActiveUid: (uid: string | null) => void;
  scopedKey: (suffix: string) => string;
  adopted: () => boolean;
  adoptLegacyProfile: (uid: string) => boolean;
}

export const createProfileNamespace = (
  raw: KeyValueStorage,
): ProfileNamespace => {
  const storage = guarded(raw);
  let active = storage.getItem(ACTIVE_UID_KEY);

  const setActiveUid = (uid: string | null): void => {
    active = uid;
    if (uid === null) storage.removeItem(ACTIVE_UID_KEY);
    else storage.setItem(ACTIVE_UID_KEY, uid);
  };

  const scopedKey = (suffix: string): string =>
    active === null ? `ca.${suffix}` : `ca.${active}.${suffix}`;

  const adopted = (): boolean => storage.getItem(ADOPTED_KEY) !== null;

  const adoptLegacyProfile = (uid: string): boolean => {
    if (adopted()) {
      setActiveUid(uid);
      return false;
    }
    for (const suffix of SCOPED_SUFFIXES) {
      const value = storage.getItem(`ca.${suffix}`);
      if (value === null) continue;
      if (storage.getItem(`ca.${uid}.${suffix}`) === null) {
        storage.setItem(`ca.${uid}.${suffix}`, value);
      }
      storage.removeItem(`ca.${suffix}`);
    }
    storage.removeItem(LEGACY_LINK_KEY);
    storage.setItem(ADOPTED_KEY, "1");
    setActiveUid(uid);
    return true;
  };

  return { activeUid: () => active, setActiveUid, scopedKey, adopted, adoptLegacyProfile };
};

const browserStorage = (): KeyValueStorage =>
  typeof localStorage === "undefined" ? createMemoryStorage() : localStorage;

export const deviceStorage = guarded(browserStorage());

export const deviceKeys = (): string[] => {
  try {
    return typeof localStorage === "undefined" ? [] : Object.keys(localStorage);
  } catch {
    return [];
  }
};

export const { activeUid, setActiveUid, scopedKey, adopted, adoptLegacyProfile } =
  createProfileNamespace(deviceStorage);

export const hasScopedValue = (suffix: string): boolean =>
  deviceStorage.getItem(scopedKey(suffix)) !== null;
