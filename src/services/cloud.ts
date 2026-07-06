import type { RunSnapshot } from "@/types";

export interface CloudRun {
  savedAt: number;
  payload: RunSnapshot;
}

export const CLOUD_SIZE_LIMIT = 90_000;

export const pushCloud = async (
  uid: string,
  savedAt: number,
  payload: RunSnapshot,
): Promise<boolean> => {
  const json = JSON.stringify(payload);
  if (json.length > CLOUD_SIZE_LIMIT) {
    console.warn(
      `cloud: payload ${String(json.length)}B exceeds ${String(CLOUD_SIZE_LIMIT)}B, skipping push`,
    );
    return false;
  }
  const { db } = await import("@/services/firebase");
  const { doc, setDoc } = await import("firebase/firestore");
  await setDoc(doc(db(), "users", uid, "run", "current"), {
    v: 1,
    savedAt,
    payload: json,
  });
  return true;
};

export const pullCloud = async (uid: string): Promise<CloudRun | null> => {
  const { db } = await import("@/services/firebase");
  const { doc, getDoc } = await import("firebase/firestore");
  const snapshot = await getDoc(doc(db(), "users", uid, "run", "current"));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const savedAt = typeof data.savedAt === "number" ? data.savedAt : 0;
  const raw = typeof data.payload === "string" ? data.payload : null;
  if (raw === null) return null;
  try {
    return { savedAt, payload: JSON.parse(raw) as RunSnapshot };
  } catch {
    return null;
  }
};
