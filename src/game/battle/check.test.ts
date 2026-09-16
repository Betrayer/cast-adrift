import { beforeEach, describe, expect, it } from "vitest";
import {
  CHECK_DECK,
  CHECK_ENEMY_HP_PCT,
  CHECK_FIXED_ROLL,
  PROLOGUE_ENEMY,
  SYSTEMS_CHECK,
} from "@/data/narrative/prologue";
import { projectSlot } from "@/game/battle/view";
import { createStreams } from "@/services/rng";
import {
  battleSnapshot,
  createInitialBattleValues,
  useBattleStore,
} from "@/stores/battleStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";

const GREEN = "die-0";
const BLUE = "die-1";
const RED = "die-2";
const GREY = "die-3";
const BLACK = "die-4";

const start = (seed = 7, sandbox = false): void => {
  useBattleStore.getState().startBattle(
    {
      enemyIds: [PROLOGUE_ENEMY],
      shipId: "wanderer",
      hull: 30,
      hullMax: 30,
      enemyHpBonusPct: CHECK_ENEMY_HP_PCT,
      checkSteps: SYSTEMS_CHECK,
      checkSandbox: sandbox,
    },
    CHECK_DECK,
    createStreams(seed),
  );
};

const place = (uid: string, slotId: SlotId): void => {
  useBattleStore.getState().placeDie(uid, slotId);
};

const turn = (): void => {
  useBattleStore.getState().endTurn();
  useBattleStore.getState().finishResolution();
};

const board = () => useBattleStore.getState();

const valueOf = (uid: string): number =>
  board().dice.find((d) => d.uid === uid)?.value ?? -1;

const playTo = (index: number): void => {
  start();
  const script: readonly (readonly [string, SlotId])[][] = [
    [[GREEN, "engines"]],
    [[BLUE, "shields"]],
    [[RED, "weaponA"]],
    [
      [GREY, "sensors"],
      [RED, "weaponA"],
    ],
    [[BLACK, "reactor"]],
  ];
  for (let i = 0; i < index; i += 1) {
    for (const [uid, slotId] of script[i] ?? []) place(uid, slotId);
    turn();
  }
};

beforeEach(() => {
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.setState(createInitialBattleValues());
  useRunStore.setState({ flags: {}, counters: {} });
  useMetaStore.setState((s) => ({
    stats: { ...s.stats, systemsCheckDone: false },
    tutorialSeen: [],
  }));
});

describe("systems check", () => {
  it("seeds the first step's roll, intent and enemy scaling", () => {
    start();
    expect(board().checkIndex).toBe(0);
    expect(board().dice.map((d) => d.value)).toEqual([...CHECK_FIXED_ROLL]);
    expect(board().enemies[0]?.nextIntent).toEqual({ t: "multi", n: 3, k: 3 });
    expect(board().enemies[0]?.hp).toBe(22);
  });

  it("carries no resonance threshold, so every projection is bare affinity", () => {
    start();
    for (const count of Object.values(board().resonance.counts)) {
      expect(count).toBeLessThan(2);
    }
  });

  it("step 1 reads glancing 18 percent and dodge 8 percent", () => {
    start();
    const projection = projectSlot(battleSnapshot(board()), GREEN, "engines");
    expect(projection?.evasion).toEqual({
      dodgePct: 8,
      glancingPct: 18,
      intercept: false,
    });
  });

  it("step 1 pins one glance, one dodge and one full hit", () => {
    start();
    place(GREEN, "engines");
    turn();
    const beat = board().enemyBeats.find((b) => b.kind === "attack");
    expect(beat?.dodged).toBe(1);
    expect(beat?.glanced).toBe(1);
    expect(board().hull).toBe(25);
  });

  it("rejects the right die in the wrong slot and names the step's reason", () => {
    start();
    place(GREEN, "shields");
    expect(board().slots.shields?.dieUid).toBeUndefined();
    expect(board().lastBlock?.key).toBe("content:check.engines.fail");
  });

  it("rejects the wrong die in the right slot", () => {
    start();
    place(BLUE, "engines");
    expect(board().slots.engines?.dieUid).toBeUndefined();
    expect(board().lastBlock?.key).toBe("content:check.engines.fail");
  });

  it("step 4 refuses the two wanted dice in each other's slots", () => {
    playTo(3);
    place(RED, "sensors");
    place(GREY, "weaponA");
    expect(board().slots.sensors?.dieUid).toBeUndefined();
    expect(board().slots.weaponA?.dieUid).toBeUndefined();
    expect(board().lastBlock?.key).toBe("content:check.sensors.fail");
  });

  it("a restricted step refuses the reserve", () => {
    start();
    useBattleStore.getState().reserveDie(GREEN);
    expect(board().dice.find((d) => d.uid === GREEN)?.state).toBe("tray");
  });

  it("holds End Turn until the step's slots are filled", () => {
    start();
    useBattleStore.getState().endTurn();
    expect(board().phase).toBe("placement");
    place(GREEN, "engines");
    useBattleStore.getState().endTurn();
    expect(board().phase).toBe("resolving");
  });

  it("step 2 reads plus six and absorbs the whole attack", () => {
    playTo(1);
    expect(board().checkIndex).toBe(1);
    expect(valueOf(BLUE)).toBe(4);
    const projection = projectSlot(battleSnapshot(board()), BLUE, "shields");
    expect(projection?.value).toBe(6);
    expect(projection?.base).toBe(4);
    expect(projection?.bonus).toBe(2);
    place(BLUE, "shields");
    turn();
    expect(board().hull).toBe(25);
  });

  it("step 3 reads seven as five plus two", () => {
    playTo(2);
    expect(board().checkIndex).toBe(2);
    const projection = projectSlot(battleSnapshot(board()), RED, "weaponA");
    expect(projection?.value).toBe(7);
    expect(projection?.base).toBe(5);
    expect(projection?.bonus).toBe(2);
    place(RED, "weaponA");
    turn();
    expect(board().enemies[0]?.hp).toBe(15);
    expect(board().hull).toBe(23);
  });

  it("step 4 marks the target and the same turn's shot carries the mark", () => {
    playTo(3);
    expect(board().checkIndex).toBe(3);
    const mark = projectSlot(battleSnapshot(board()), GREY, "sensors");
    expect(mark?.sensor?.vulnerable).toBe(2);
    place(GREY, "sensors");
    const shot = projectSlot(battleSnapshot(board()), RED, "weaponA");
    expect(shot?.value).toBe(7);
    expect(shot?.amount).toBe(9);
    place(RED, "weaponA");
    turn();
    expect(board().enemies[0]?.hp).toBe(6);
    expect(board().hull).toBe(21);
  });

  it("step 5 overflows at four and stops overflowing when nudged down", () => {
    playTo(4);
    expect(board().checkIndex).toBe(4);
    expect(board().charge).toBe(6);
    expect(board().freeNudges).toBe(1);
    const overflow = projectSlot(battleSnapshot(board()), BLACK, "reactor");
    expect(overflow?.amount).toBe(6);
    expect(overflow?.overflowHull).toBe(2);
    useBattleStore.getState().spendNudge(BLACK, -1);
    expect(valueOf(BLACK)).toBe(3);
    expect(board().freeNudges).toBe(0);
    const nudged = projectSlot(battleSnapshot(board()), BLACK, "reactor");
    expect(nudged?.amount).toBe(4);
    expect(nudged?.overflowHull).toBe(0);
    place(BLACK, "reactor");
    turn();
    expect(board().charge).toBe(10);
    expect(board().hull).toBe(19);
  });

  it("step 6 lifts every restriction and the drone is still alive for it", () => {
    playTo(5);
    expect(board().checkIndex).toBe(SYSTEMS_CHECK.length - 1);
    expect(board().enemies[0]?.hp).toBeGreaterThan(0);
    expect(board().checkSteps?.[board().checkIndex]?.moves).toBeNull();
    place(RED, "shields");
    expect(board().slots.shields?.dieUid).toBe(RED);
  });

  it("the last step retires the runner and marks the check done", () => {
    playTo(5);
    place(RED, "weaponA");
    turn();
    expect(board().checkSteps).toBeNull();
    expect(useMetaStore.getState().stats.systemsCheckDone).toBe(true);
  });

  it("skipping clears the runner and frees the board", () => {
    start();
    useBattleStore.getState().skipCheck();
    expect(board().checkSteps).toBeNull();
    expect(useMetaStore.getState().stats.systemsCheckDone).toBe(true);
    place(GREEN, "shields");
    expect(board().slots.shields?.dieUid).toBe(GREEN);
  });

  it("a sandbox check writes nothing to the profile", () => {
    start(7, true);
    useBattleStore.getState().skipCheck();
    expect(useMetaStore.getState().stats.systemsCheckDone).toBe(false);
  });

  it("restarting the current step rebuilds it from the step data", () => {
    playTo(4);
    place(BLACK, "reactor");
    useBattleStore.setState({ charge: 0 });
    expect(board().slots.reactor?.dieUid).toBe(BLACK);
    useBattleStore.getState().restartCheckStep();
    expect(board().slots.reactor?.dieUid).toBe(BLACK);
    expect(board().charge).toBe(6);
    expect(valueOf(BLACK)).toBe(4);
  });

  it("the check never moves the run's drift axis", () => {
    playTo(2);
    expect(board().blueUsed).toBe(0);
    expect(board().blackUsed).toBe(0);
  });
});
