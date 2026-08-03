import { isTelegramUid } from "@/services/uid";

const LINKED_KEY = "ca.link.at";

export type LinkOutcome =
  | "skipped"
  | "already-linked"
  | "copied"
  | "kept-telegram"
  | "replaced-telegram"
  | "failed";

export interface MetaDoc {
  v: number;
  updatedAt: number;
  data: string;
  linkedFrom?: string;
}

const readMarker = (): boolean => {
  try {
    return localStorage.getItem(LINKED_KEY) !== null;
  } catch {
    return false;
  }
};

const writeMarker = (): void => {
  try {
    localStorage.setItem(LINKED_KEY, String(Date.now()));
  } catch {
    /* storage unavailable */
  }
};

const asMetaDoc = (value: unknown): MetaDoc | null => {
  if (typeof value !== "object" || value === null) return null;
  const doc = value as Partial<MetaDoc>;
  if (typeof doc.v !== "number") return null;
  if (typeof doc.data !== "string") return null;
  return {
    v: doc.v,
    updatedAt: typeof doc.updatedAt === "number" ? doc.updatedAt : 0,
    data: doc.data,
  };
};

// The merge policy from DESIGN §4, isolated from Firestore so it is testable:
// an empty Telegram profile takes the anonymous one whole; two real profiles
// never interleave — the newer one wins and the loser is archived.
export const resolveLink = (
  anon: MetaDoc | null,
  telegram: MetaDoc | null,
): Exclude<LinkOutcome, "skipped" | "already-linked" | "failed"> => {
  if (anon === null) return "kept-telegram";
  if (telegram === null) return "copied";
  return telegram.updatedAt >= anon.updatedAt
    ? "kept-telegram"
    : "replaced-telegram";
};

// The anonymous meta document has to be read while the anonymous user is still
// signed in, so the caller checks this first, reads, then swaps identities.
export const shouldAttemptLink = (anonUid: string | null): boolean =>
  anonUid !== null && !isTelegramUid(anonUid) && !readMarker();

export interface LinkAccountsOptions {
  anonUid: string | null;
  telegramUid: string | null;
  anonMeta: MetaDoc | null;
}

// Runs at most once per device: the marker survives the sign-in swap, and a
// second Telegram boot from the same browser has nothing left to migrate.
export const linkAccounts = async ({
  anonUid,
  telegramUid,
  anonMeta,
}: LinkAccountsOptions): Promise<LinkOutcome> => {
  if (telegramUid === null || !isTelegramUid(telegramUid)) return "skipped";
  if (anonUid === null || anonUid === telegramUid) return "skipped";
  if (isTelegramUid(anonUid)) return "skipped";
  if (readMarker()) return "already-linked";
  try {
    const anon = anonMeta;
    const { db } = await import("@/services/firebase");
    const { doc, getDoc, setDoc } = await import("firebase/firestore");
    const target = doc(db(), "users", telegramUid, "meta", "progress");
    const snapshot = await getDoc(target);
    const telegram = snapshot.exists() ? asMetaDoc(snapshot.data()) : null;
    const outcome = resolveLink(anon, telegram);
    if (outcome === "copied" || outcome === "replaced-telegram") {
      if (anon === null) return "failed";
      if (telegram !== null) {
        await setDoc(
          doc(
            db(),
            "users",
            telegramUid,
            "meta",
            `backup-${String(Date.now())}`,
          ),
          telegram,
        );
      }
      await setDoc(target, { ...anon, linkedFrom: anonUid });
    }
    writeMarker();
    return outcome;
  } catch (error) {
    console.warn("account-link: merge failed", error);
    return "failed";
  }
};

export const readMetaDocFor = async (uid: string): Promise<MetaDoc | null> => {
  try {
    const { db } = await import("@/services/firebase");
    const { doc, getDoc } = await import("firebase/firestore");
    const snapshot = await getDoc(doc(db(), "users", uid, "meta", "progress"));
    return snapshot.exists() ? asMetaDoc(snapshot.data()) : null;
  } catch (error) {
    console.warn("account-link: anon meta read failed", error);
    return null;
  }
};
