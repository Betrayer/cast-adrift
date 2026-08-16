import { plausibility, MAX_BOARD_SCORE } from "@/game/run/plausibility";

export type BoardKind = "daily" | "driftAlltime" | "driftWeekly";

export const DRIFT_ALLTIME_BOARD = "drift-alltime";
export const NAME_MAX = 24;
export const TOP_SIZE = 100;
export const AROUND_WINDOW = 5;

export const dailyBoardId = (date: string): string => `daily-${date}`;
export const driftWeeklyBoardId = (week: string): string =>
  `drift-weekly-${week}`;

export type DailyState = "started" | "done";

export interface BoardEntry {
  uid: string;
  name: string;
  score: number;
  level: number;
  ship: string;
  depth: number;
  kills: number;
  scrap: number;
  updatedAt: number;
  hash?: number;
  state?: DailyState;
  flagged?: boolean;
}

export interface RankedEntry extends BoardEntry {
  rank: number;
  isMe: boolean;
}

export interface AroundMe {
  rank: number | null;
  rows: RankedEntry[];
}

export const boardKind = (board: string): BoardKind =>
  board.startsWith("daily-")
    ? "daily"
    : board.startsWith("drift-weekly-")
      ? "driftWeekly"
      : "driftAlltime";

export const onlyIfHigher = (board: string): boolean =>
  boardKind(board) !== "daily";

export const truncateName = (raw: string): string =>
  raw.trim().slice(0, NAME_MAX);

export const entryValid = (entry: BoardEntry): boolean =>
  typeof entry.uid === "string" &&
  entry.uid.length > 0 &&
  typeof entry.name === "string" &&
  entry.name.length > 0 &&
  entry.name.length <= NAME_MAX &&
  Number.isInteger(entry.score) &&
  entry.score >= 0 &&
  entry.score <= MAX_BOARD_SCORE &&
  Number.isInteger(entry.level) &&
  entry.level >= 1 &&
  Number.isInteger(entry.depth) &&
  entry.depth >= 0 &&
  Number.isInteger(entry.kills) &&
  entry.kills >= 0 &&
  Number.isInteger(entry.scrap) &&
  entry.scrap >= 0 &&
  typeof entry.ship === "string" &&
  entry.ship.length > 0;

export const entryHidden = (entry: BoardEntry, board: string): boolean => {
  if (entry.flagged === true) return true;
  if (boardKind(board) === "daily" && entry.state === "started") return true;
  return !plausibility({
    score: entry.score,
    depth: entry.depth,
    kills: entry.kills,
    scrap: entry.scrap,
    hash: entry.hash,
    requiresHash: boardKind(board) === "daily",
  }).ok;
};

export const visibleEntries = (
  entries: readonly BoardEntry[],
  board: string,
  showFlagged: boolean,
): BoardEntry[] =>
  showFlagged ? [...entries] : entries.filter((e) => !entryHidden(e, board));

export const rankEntries = (
  entries: readonly BoardEntry[],
  uid: string | null,
  firstRank = 1,
): RankedEntry[] =>
  [...entries]
    .sort((a, b) => b.score - a.score || a.updatedAt - b.updatedAt)
    .map((entry, index) => ({
      ...entry,
      rank: firstRank + index,
      isMe: entry.uid === uid,
    }));

const entryDoc = (entry: BoardEntry, updatedAt: number): Record<string, unknown> => {
  const doc: Record<string, unknown> = {
    name: entry.name,
    score: entry.score,
    level: entry.level,
    ship: entry.ship,
    depth: entry.depth,
    kills: entry.kills,
    scrap: entry.scrap,
    updatedAt,
  };
  if (entry.hash !== undefined) doc.hash = entry.hash;
  if (entry.state !== undefined) doc.state = entry.state;
  if (entry.flagged === true) doc.flagged = true;
  return doc;
};

const parseEntry = (uid: string, data: Record<string, unknown>): BoardEntry => ({
  uid,
  name: typeof data.name === "string" ? data.name : uid,
  score: typeof data.score === "number" ? data.score : 0,
  level: typeof data.level === "number" ? data.level : 1,
  ship: typeof data.ship === "string" ? data.ship : "wanderer",
  depth: typeof data.depth === "number" ? data.depth : 0,
  kills: typeof data.kills === "number" ? data.kills : 0,
  scrap: typeof data.scrap === "number" ? data.scrap : 0,
  updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
  ...(typeof data.hash === "number" ? { hash: data.hash } : {}),
  ...(data.state === "started" || data.state === "done"
    ? { state: data.state }
    : {}),
  ...(data.flagged === true ? { flagged: true } : {}),
});

export const submit = async (
  board: string,
  entry: BoardEntry,
): Promise<boolean> => {
  if (!entryValid(entry)) {
    console.warn("leaderboards: entry failed pre-flight, not submitting");
    return false;
  }
  try {
    const { db } = await import("@/services/firebase");
    const { doc, getDoc, setDoc } = await import("firebase/firestore");
    const ref = doc(db(), "leaderboards", board, "entries", entry.uid);
    if (onlyIfHigher(board)) {
      const existing = await getDoc(ref);
      const prev = existing.exists()
        ? parseEntry(entry.uid, existing.data())
        : null;
      if (prev !== null && prev.score >= entry.score) return false;
    }
    await setDoc(ref, entryDoc(entry, Date.now()), { merge: true });
    return true;
  } catch (error) {
    console.warn("leaderboards: submit failed", error);
    return false;
  }
};

export const top = async (
  board: string,
  limitTo = TOP_SIZE,
): Promise<BoardEntry[]> => {
  try {
    const { db } = await import("@/services/firebase");
    const { collection, getDocs, limit, orderBy, query } = await import(
      "firebase/firestore"
    );
    const snapshot = await getDocs(
      query(
        collection(db(), "leaderboards", board, "entries"),
        orderBy("score", "desc"),
        limit(limitTo),
      ),
    );
    return snapshot.docs.map((d) => parseEntry(d.id, d.data()));
  } catch (error) {
    console.warn("leaderboards: top failed", error);
    return [];
  }
};

export const myEntry = async (
  board: string,
  uid: string,
): Promise<BoardEntry | null> => {
  try {
    const { db } = await import("@/services/firebase");
    const { doc, getDoc } = await import("firebase/firestore");
    const snapshot = await getDoc(
      doc(db(), "leaderboards", board, "entries", uid),
    );
    if (!snapshot.exists()) return null;
    return parseEntry(uid, snapshot.data());
  } catch (error) {
    console.warn("leaderboards: myEntry failed", error);
    return null;
  }
};

export const aroundMe = async (
  board: string,
  uid: string,
): Promise<AroundMe> => {
  try {
    const mine = await myEntry(board, uid);
    if (mine === null) return { rank: null, rows: [] };
    const { db } = await import("@/services/firebase");
    const {
      collection,
      getCountFromServer,
      getDocs,
      limit,
      orderBy,
      query,
      where,
    } = await import("firebase/firestore");
    const entries = collection(db(), "leaderboards", board, "entries");
    const ahead = await getCountFromServer(
      query(entries, where("score", ">", mine.score)),
    );
    const rank = ahead.data().count + 1;
    const [above, below] = await Promise.all([
      getDocs(
        query(
          entries,
          where("score", ">", mine.score),
          orderBy("score", "asc"),
          limit(AROUND_WINDOW),
        ),
      ),
      getDocs(
        query(
          entries,
          where("score", "<", mine.score),
          orderBy("score", "desc"),
          limit(AROUND_WINDOW),
        ),
      ),
    ]);
    const rows = [
      ...above.docs.map((d) => parseEntry(d.id, d.data())),
      mine,
      ...below.docs.map((d) => parseEntry(d.id, d.data())),
    ];
    const firstRank = Math.max(1, rank - above.docs.length);
    return { rank, rows: rankEntries(rows, uid, firstRank) };
  } catch (error) {
    console.warn("leaderboards: aroundMe failed", error);
    return { rank: null, rows: [] };
  }
};

export const startDaily = async (
  board: string,
  uid: string,
  name: string,
  level: number,
  ship: string,
): Promise<boolean> => {
  try {
    const { db } = await import("@/services/firebase");
    const { doc, getDoc, setDoc } = await import("firebase/firestore");
    const ref = doc(db(), "leaderboards", board, "entries", uid);
    const existing = await getDoc(ref);
    if (existing.exists()) return false;
    await setDoc(ref, {
      name: truncateName(name),
      score: 0,
      level,
      ship,
      depth: 0,
      kills: 0,
      scrap: 0,
      updatedAt: Date.now(),
      state: "started",
    });
    return true;
  } catch (error) {
    console.warn("leaderboards: startDaily failed", error);
    return false;
  }
};
