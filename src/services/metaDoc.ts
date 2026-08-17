export const META_DOC_V = 1;

export interface MetaDoc {
  v: number;
  updatedAt: number;
  data: string;
  linkedFrom?: string;
}

export interface ProfileSummary {
  level: number;
  shards: number;
  runs: number;
  driftBest: number;
  dailies: number;
  updatedAt: number;
}

export const EMPTY_SUMMARY: ProfileSummary = {
  level: 1,
  shards: 0,
  runs: 0,
  driftBest: 0,
  dailies: 0,
  updatedAt: 0,
};

export const asMetaDoc = (value: unknown): MetaDoc | null => {
  if (typeof value !== "object" || value === null) return null;
  const doc = value as Partial<MetaDoc>;
  if (typeof doc.v !== "number") return null;
  if (typeof doc.data !== "string") return null;
  return {
    v: doc.v,
    updatedAt: typeof doc.updatedAt === "number" ? doc.updatedAt : 0,
    data: doc.data,
    ...(typeof doc.linkedFrom === "string" ? { linkedFrom: doc.linkedFrom } : {}),
  };
};

const numberAt = (source: Record<string, unknown>, key: string): number => {
  const value = source[key];
  return typeof value === "number" ? value : 0;
};

export const profileSummary = (doc: MetaDoc | null): ProfileSummary => {
  if (doc === null) return EMPTY_SUMMARY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(doc.data);
  } catch {
    return { ...EMPTY_SUMMARY, updatedAt: doc.updatedAt };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { ...EMPTY_SUMMARY, updatedAt: doc.updatedAt };
  }
  const values = parsed as Record<string, unknown>;
  const stats = values.stats;
  const runs =
    typeof stats === "object" && stats !== null
      ? numberAt(stats as Record<string, unknown>, "runs")
      : 0;
  const best = values.best;
  const driftBest =
    typeof best === "object" && best !== null
      ? numberAt(best as Record<string, unknown>, "drift")
      : 0;
  const played = values.dailyPlayed;
  const dailies =
    typeof played === "object" && played !== null
      ? Object.keys(played as Record<string, unknown>).length
      : 0;
  return {
    level: Math.max(1, numberAt(values, "level")),
    shards: numberAt(values, "shards"),
    runs,
    driftBest,
    dailies,
    updatedAt: doc.updatedAt,
  };
};

export const isEmptyProfile = (summary: ProfileSummary): boolean =>
  summary.level <= 1 &&
  summary.shards === 0 &&
  summary.runs === 0 &&
  summary.driftBest === 0 &&
  summary.dailies === 0;

export interface MetaDocPort {
  read: (uid: string) => Promise<MetaDoc | null>;
  write: (uid: string, doc: MetaDoc) => Promise<void>;
  archive: (uid: string, doc: MetaDoc, at: number) => Promise<void>;
}

export const firestoreMetaDocs: MetaDocPort = {
  read: async (uid) => {
    const { db } = await import("@/services/firebase");
    const { doc, getDoc } = await import("firebase/firestore");
    const snapshot = await getDoc(doc(db(), "users", uid, "meta", "progress"));
    return snapshot.exists() ? asMetaDoc(snapshot.data()) : null;
  },
  write: async (uid, value) => {
    const { db } = await import("@/services/firebase");
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db(), "users", uid, "meta", "progress"), value);
  },
  archive: async (uid, value, at) => {
    const { db } = await import("@/services/firebase");
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(
      doc(db(), "users", uid, "meta", `backup-${String(at)}`),
      value,
    );
  },
};

export const readMetaDocFromServer = async (
  uid: string,
): Promise<MetaDoc | null> => {
  const { db } = await import("@/services/firebase");
  const { doc, getDocFromServer } = await import("firebase/firestore");
  const snapshot = await getDocFromServer(
    doc(db(), "users", uid, "meta", "progress"),
  );
  return snapshot.exists() ? asMetaDoc(snapshot.data()) : null;
};

export const readMetaDocFor = async (uid: string): Promise<MetaDoc | null> => {
  try {
    return await firestoreMetaDocs.read(uid);
  } catch (error) {
    console.warn("metaDoc: read failed", error);
    return null;
  }
};
