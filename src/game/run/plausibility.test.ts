import { describe, expect, it } from "vitest";
import {
  plausibility,
  MAX_BOARD_SCORE,
  MAX_KILLS_PER_DEPTH,
  MAX_SCORE_PER_DEPTH,
  MAX_SCRAP_PER_DEPTH,
} from "@/game/run/plausibility";
import {
  AROUND_WINDOW,
  entryHidden,
  entryValid,
  NAME_MAX,
  onlyIfHigher,
  rankEntries,
  truncateName,
  visibleEntries,
  boardKind,
  type BoardEntry,
} from "@/services/leaderboards";

const legit = (patch: Partial<BoardEntry> = {}): BoardEntry => ({
  uid: "uid-1",
  name: "Captain-1A2B",
  score: 1500,
  level: 12,
  ship: "wanderer",
  depth: 30,
  kills: 40,
  scrap: 600,
  updatedAt: 1_700_000_000_000,
  hash: 123456,
  ...patch,
});

describe("plausibility", () => {
  it("passes a legitimate high-score run", () => {
    const run = legit();
    expect(
      plausibility({
        score: run.score,
        depth: run.depth,
        kills: run.kills,
        scrap: run.scrap,
      }).ok,
    ).toBe(true);
  });

  it("derives the per-depth ceiling from the score formula", () => {
    expect(MAX_SCORE_PER_DEPTH).toBe(50 + MAX_KILLS_PER_DEPTH * 5 + MAX_SCRAP_PER_DEPTH);
  });

  it("rejects a score no depth could have produced", () => {
    const result = plausibility({ score: 99_999, depth: 3, kills: 1, scrap: 1 });
    expect(result.ok).toBe(false);
    expect(result.reasons).toContain("scorePerDepth");
  });

  it("rejects a zero-depth submission with any score", () => {
    expect(plausibility({ score: 1, depth: 0, kills: 0, scrap: 0 }).ok).toBe(
      false,
    );
  });

  it("rejects too many kills and too much scrap per row", () => {
    expect(
      plausibility({ score: 0, depth: 10, kills: 41, scrap: 0 }).reasons,
    ).toContain("killsPerDepth");
    expect(
      plausibility({ score: 0, depth: 10, kills: 0, scrap: 801 }).reasons,
    ).toContain("scrapPerDepth");
  });

  it("rejects negatives and scores past the board cap", () => {
    expect(
      plausibility({ score: -1, depth: 5, kills: 0, scrap: 0 }).reasons,
    ).toContain("negative");
    expect(
      plausibility({
        score: MAX_BOARD_SCORE + 1,
        depth: 100_000,
        kills: 0,
        scrap: 0,
      }).reasons,
    ).toContain("scoreOverCap");
  });

  it("requires an action hash when the daily asks for one", () => {
    const base = { score: 100, depth: 10, kills: 1, scrap: 10 };
    expect(plausibility({ ...base, requiresHash: true }).reasons).toContain(
      "missingHash",
    );
    expect(plausibility({ ...base, requiresHash: true, hash: 0 }).reasons).toContain(
      "missingHash",
    );
    expect(plausibility({ ...base, requiresHash: true, hash: 7 }).ok).toBe(true);
    expect(plausibility(base).ok).toBe(true);
  });
});

describe("leaderboard entries", () => {
  it("accepts a well-formed entry and rejects broken shapes", () => {
    expect(entryValid(legit())).toBe(true);
    expect(entryValid(legit({ name: "" }))).toBe(false);
    expect(entryValid(legit({ name: "x".repeat(NAME_MAX + 1) }))).toBe(false);
    expect(entryValid(legit({ score: MAX_BOARD_SCORE + 1 }))).toBe(false);
    expect(entryValid(legit({ score: -1 }))).toBe(false);
    expect(entryValid(legit({ score: 1.5 }))).toBe(false);
    expect(entryValid(legit({ level: 0 }))).toBe(false);
    expect(entryValid(legit({ ship: "" }))).toBe(false);
    expect(entryValid(legit({ uid: "" }))).toBe(false);
  });

  it("truncates a long Telegram name to the rules limit", () => {
    expect(truncateName("  Konstantin Aleksandrovich Petrov  ").length).toBe(
      NAME_MAX,
    );
    expect(truncateName(" Mara ")).toBe("Mara");
  });

  it("classifies boards and knows which ones only accept improvements", () => {
    expect(boardKind("daily-2026-07-27")).toBe("daily");
    expect(boardKind("drift-weekly-2026-30")).toBe("driftWeekly");
    expect(boardKind("drift-alltime")).toBe("driftAlltime");
    expect(onlyIfHigher("daily-2026-07-27")).toBe(false);
    expect(onlyIfHigher("drift-alltime")).toBe(true);
  });

  it("hides flagged entries and re-derives bounds on read", () => {
    const board = "drift-alltime";
    expect(entryHidden(legit(), board)).toBe(false);
    expect(entryHidden(legit({ flagged: true }), board)).toBe(true);
    // Forged straight into Firestore without the flag: the reader still hides it.
    expect(entryHidden(legit({ score: 400_000, depth: 12 }), board)).toBe(true);
  });

  it("hides a claimed-but-unplayed daily row and demands a hash", () => {
    const board = "daily-2026-07-27";
    expect(entryHidden(legit({ state: "started", score: 0 }), board)).toBe(true);
    expect(entryHidden(legit({ state: "done" }), board)).toBe(false);
    expect(entryHidden(legit({ state: "done", hash: undefined }), board)).toBe(
      true,
    );
  });

  it("keeps flagged rows when the debug view asks for them", () => {
    const rows = [legit(), legit({ uid: "uid-2", flagged: true })];
    expect(visibleEntries(rows, "drift-alltime", false)).toHaveLength(1);
    expect(visibleEntries(rows, "drift-alltime", true)).toHaveLength(2);
  });

  it("ranks by score descending, earliest submission winning ties", () => {
    const rows = [
      legit({ uid: "a", score: 100, updatedAt: 20 }),
      legit({ uid: "b", score: 300, updatedAt: 30 }),
      legit({ uid: "c", score: 100, updatedAt: 10 }),
    ];
    const ranked = rankEntries(rows, "c");
    expect(ranked.map((e) => e.uid)).toEqual(["b", "c", "a"]);
    expect(ranked.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(ranked.find((e) => e.isMe)?.uid).toBe("c");
  });

  it("offsets ranks for an around-me window", () => {
    const rows = [
      legit({ uid: "a", score: 900 }),
      legit({ uid: "me", score: 800 }),
      legit({ uid: "b", score: 700 }),
    ];
    const ranked = rankEntries(rows, "me", 41);
    expect(ranked.map((e) => e.rank)).toEqual([41, 42, 43]);
    expect(ranked.find((e) => e.isMe)?.rank).toBe(42);
  });
});

describe("around-me on a seeded 50-entry board", () => {
  // Descending scores 5000, 4900, … 100 — so uid-N sits at rank N exactly.
  const BOARD: BoardEntry[] = Array.from({ length: 50 }, (_, i) =>
    legit({
      uid: `uid-${String(i + 1)}`,
      name: `Captain-${String(i + 1).padStart(4, "0")}`,
      score: (50 - i) * 100,
      depth: 40,
      kills: 30,
      scrap: 500,
      updatedAt: 1_700_000_000_000 + i,
    }),
  );

  const windowFor = (uid: string, size = AROUND_WINDOW) => {
    const sorted = [...BOARD].sort((a, b) => b.score - a.score);
    const index = sorted.findIndex((e) => e.uid === uid);
    const from = Math.max(0, index - size);
    const rows = sorted.slice(from, index + size + 1);
    return rankEntries(rows, uid, from + 1);
  };

  it("ranks the whole board 1..50 with no gaps", () => {
    const ranked = rankEntries(BOARD, null);
    expect(ranked).toHaveLength(50);
    expect(ranked[0]?.uid).toBe("uid-1");
    expect(ranked[49]?.uid).toBe("uid-50");
    expect(ranked.map((e) => e.rank)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
  });

  it("centres the window on the player mid-board", () => {
    const rows = windowFor("uid-25");
    expect(rows).toHaveLength(AROUND_WINDOW * 2 + 1);
    expect(rows.find((e) => e.isMe)?.rank).toBe(25);
    expect(rows[0]?.rank).toBe(20);
    expect(rows[rows.length - 1]?.rank).toBe(30);
    // Ranks stay contiguous across the window.
    expect(rows.map((e) => e.rank)).toEqual(
      Array.from({ length: 11 }, (_, i) => 20 + i),
    );
  });

  it("clamps the window at the top of the board", () => {
    const rows = windowFor("uid-2");
    expect(rows[0]?.rank).toBe(1);
    expect(rows.find((e) => e.isMe)?.rank).toBe(2);
    expect(rows[0]?.uid).toBe("uid-1");
  });

  it("clamps the window at the bottom of the board", () => {
    const rows = windowFor("uid-49");
    expect(rows.find((e) => e.isMe)?.rank).toBe(49);
    expect(rows[rows.length - 1]?.rank).toBe(50);
    expect(rows[rows.length - 1]?.uid).toBe("uid-50");
  });

  it("keeps my row present even when it would be hidden as implausible", () => {
    const board = "drift-alltime";
    const forged = legit({ uid: "me", score: 490_000, depth: 5 });
    const rows = rankEntries([...BOARD, forged], "me");
    const shown = rows.filter((e) => e.isMe || !entryHidden(e, board));
    expect(shown.find((e) => e.isMe)).toBeDefined();
    expect(shown.filter((e) => !e.isMe)).toHaveLength(50);
    // …but everyone else's view drops it.
    expect(visibleEntries([...BOARD, forged], board, false)).toHaveLength(50);
  });
});
