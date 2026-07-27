import { beforeEach, describe, expect, it } from "vitest";
import {
  ACTION_HASH_SEED,
  actionLogState,
  recordAction,
  resetActionLog,
  restoreActionLog,
  rollActionHash,
  syncActionStats,
} from "@/game/run/actionLog";
import { useRunStore } from "@/stores/runStore";

const SCRIPT = [
  "place:red-d6:4:weaponA",
  "place:blue-d6:5:shields",
  "jump:r1l2",
  "place:grey-d4:2:reactor",
  "jump:r2l2",
];

describe("action log", () => {
  beforeEach(() => {
    resetActionLog();
    useRunStore.getState().reset();
  });

  it("starts from the fnv1a offset basis with nothing recorded", () => {
    expect(actionLogState()).toEqual({ hash: ACTION_HASH_SEED, count: 0 });
  });

  it("is stable across replays of the same action script", () => {
    for (const token of SCRIPT) recordAction(token);
    const first = actionLogState();
    resetActionLog();
    for (const token of SCRIPT) recordAction(token);
    expect(actionLogState()).toEqual(first);
    expect(first.count).toBe(SCRIPT.length);
  });

  it("is order-sensitive", () => {
    for (const token of SCRIPT) recordAction(token);
    const forward = actionLogState().hash;
    resetActionLog();
    for (const token of [...SCRIPT].reverse()) recordAction(token);
    expect(actionLogState().hash).not.toBe(forward);
  });

  it("changes when a single placement changes", () => {
    for (const token of SCRIPT) recordAction(token);
    const original = actionLogState().hash;
    resetActionLog();
    for (const token of SCRIPT) {
      recordAction(token === "jump:r1l2" ? "jump:r1l3" : token);
    }
    expect(actionLogState().hash).not.toBe(original);
  });

  it("rolls a script from a starting state identically to recording it", () => {
    const rolled = rollActionHash(
      { hash: ACTION_HASH_SEED, count: 0 },
      SCRIPT,
    );
    for (const token of SCRIPT) recordAction(token);
    expect(rolled).toEqual(actionLogState());
  });

  it("syncs into run stats only at a boundary, and survives a restore", () => {
    for (const token of SCRIPT) recordAction(token);
    expect(useRunStore.getState().stats.actionHash).toBe(0);
    syncActionStats();
    const stats = useRunStore.getState().stats;
    expect(stats.actionHash).toBe(actionLogState().hash);
    expect(stats.actionCount).toBe(SCRIPT.length);

    resetActionLog();
    restoreActionLog({ hash: stats.actionHash, count: stats.actionCount });
    expect(actionLogState()).toEqual({
      hash: stats.actionHash,
      count: stats.actionCount,
    });
  });
});
