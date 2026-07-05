import { beforeEach, describe, expect, it } from "vitest";
import { STARTER_DECK } from "@/data/decks";
import { createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  useBattleStore,
  type BattleValues,
} from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";
import type { RolledDie } from "@/types/battle";

const start = (seed = 42, enemyIds: string[] = ["raider"]) => {
  useBattleStore
    .getState()
    .startBattle({ enemyIds }, STARTER_DECK, createStreams(seed));
};

const finish = () => {
  useBattleStore.getState().finishResolution();
};

const materialValues = (s: BattleValues) => ({
  turn: s.turn,
  hull: s.hull,
  shield: s.shield,
  charge: s.charge,
  dice: s.dice,
  slots: s.slots,
  enemies: s.enemies,
  targetId: s.targetId,
  engineState: s.engineState,
  nextTurnMods: s.nextTurnMods,
  blockedSlots: s.blockedSlots,
  lockedDice: s.lockedDice,
  outcome: s.outcome,
  phase: s.phase,
});

beforeEach(() => {
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.setState(createInitialBattleValues());
  useRunStore.setState({ pendingDeepScan: false });
});

describe("startBattle", () => {
  it("rolls 5 tray dice and grants one reroll", () => {
    start();
    const { dice, phase, turn, rerollsLeft, rerollSize } =
      useBattleStore.getState();
    expect(phase).toBe("placement");
    expect(turn).toBe(1);
    expect(rerollsLeft).toBe(1);
    expect(rerollSize).toBe(2);
    expect(dice).toHaveLength(5);
    for (const die of dice) {
      expect(die.state).toBe("tray");
      expect(die.value).toBeGreaterThanOrEqual(1);
      expect(die.value).toBeLessThanOrEqual(die.tier);
    }
  });

  it("builds the full Wanderer 2×3 slot grid", () => {
    start();
    const { slots, enemies, targetId } = useBattleStore.getState();
    expect(slots.weaponA).toEqual({ cap: 8, mk: 1 });
    expect(slots.weaponB).toEqual({ cap: 8, mk: 1 });
    expect(slots.shields).toEqual({ cap: 8, mk: 1 });
    expect(slots.engines).toEqual({ cap: 6, mk: 1 });
    expect(slots.sensors).toEqual({ cap: 6, mk: 1 });
    expect(slots.reactor).toEqual({ cap: 10, mk: 1 });
    expect(slots.spinal).toBeUndefined();
    expect(targetId).toBe(enemies[0]?.id);
  });

  it("builds the ram-proto debug ship with a spinal mount", () => {
    useBattleStore
      .getState()
      .startBattle(
        { enemyIds: ["raider"], shipId: "ram-proto" },
        STARTER_DECK,
        createStreams(1),
      );
    const { slots, shipId } = useBattleStore.getState();
    expect(shipId).toBe("ram-proto");
    expect(slots.spinal).toEqual({ cap: 20, mk: 1, jamOn: 4 });
    expect(slots.weaponA).toBeUndefined();
  });

  it("expands the mineCluster encounter group", () => {
    start(42, ["mineCluster"]);
    const { enemies } = useBattleStore.getState();
    expect(enemies).toHaveLength(3);
    expect(enemies.every((e) => e.defId === "mine")).toBe(true);
  });

  it("is deterministic for a given seed", () => {
    start(7);
    const first = useBattleStore.getState().dice.map((d) => d.value);
    start(7);
    const second = useBattleStore.getState().dice.map((d) => d.value);
    expect(second).toEqual(first);
  });
});

describe("placement rules", () => {
  it("rejects placement into a blocked slot", () => {
    start();
    useBattleStore.setState({
      blockedSlots: [{ slot: "weaponA", untilTurn: 1 }],
    });
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.getState().placeDie(uid, "weaponA");
    expect(useBattleStore.getState().slots.weaponA?.dieUid).toBeUndefined();
    useBattleStore.getState().placeDie(uid, "weaponB");
    expect(useBattleStore.getState().slots.weaponB?.dieUid).toBe(uid);
  });

  it("rejects placing a locked die", () => {
    start();
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.setState({ lockedDice: [{ uid, untilTurn: 1 }] });
    useBattleStore.getState().placeDie(uid, "weaponA");
    expect(useBattleStore.getState().slots.weaponA?.dieUid).toBeUndefined();
  });

  it("rejects a die above the slot cap", () => {
    start();
    const big: RolledDie = {
      uid: "die-big",
      defId: "red-d6",
      tier: 12,
      school: "red",
      value: 9,
      state: "tray",
    };
    useBattleStore.setState((s) => ({ dice: [...s.dice, big] }));
    useBattleStore.getState().placeDie("die-big", "weaponA");
    expect(useBattleStore.getState().slots.weaponA?.dieUid).toBeUndefined();
  });
});

describe("reserve", () => {
  it("accepts exactly one die", () => {
    start();
    const [a, b] = useBattleStore.getState().dice;
    useBattleStore.getState().reserveDie(a?.uid ?? "");
    useBattleStore.getState().reserveDie(b?.uid ?? "");
    const s = useBattleStore.getState();
    expect(s.dice.filter((d) => d.state === "reserved")).toHaveLength(1);
    expect(s.dice.find((d) => d.uid === a?.uid)?.state).toBe("reserved");
  });

  it("carries the kept value into the next turn", () => {
    start();
    const first = useBattleStore.getState().dice[0];
    const uid = first?.uid ?? "";
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => (d.uid === uid ? { ...d, value: 6 } : d)),
    }));
    useBattleStore.getState().reserveDie(uid);
    useBattleStore.getState().endTurn();
    finish();
    const s = useBattleStore.getState();
    expect(s.turn).toBe(2);
    const kept = s.dice.find((d) => d.uid === uid);
    expect(kept?.state).toBe("tray");
    expect(kept?.value).toBe(6);
  });
});

describe("reactor spends", () => {
  it("nudge shifts a die value within [1, tier] for 3 charge", () => {
    start();
    useBattleStore.setState({ charge: 7 });
    const die = useBattleStore.getState().dice.find((d) => d.tier === 6);
    const uid = die?.uid ?? "";
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => (d.uid === uid ? { ...d, value: 6 } : d)),
    }));
    useBattleStore.getState().spendNudge(uid, 1);
    expect(useBattleStore.getState().charge).toBe(7);
    useBattleStore.getState().spendNudge(uid, -1);
    let s = useBattleStore.getState();
    expect(s.charge).toBe(4);
    expect(s.dice.find((d) => d.uid === uid)?.value).toBe(5);
    useBattleStore.getState().spendNudge(uid, -1);
    s = useBattleStore.getState();
    expect(s.charge).toBe(1);
    expect(s.dice.find((d) => d.uid === uid)?.value).toBe(4);
    useBattleStore.getState().spendNudge(uid, -1);
    expect(useBattleStore.getState().charge).toBe(1);
  });

  it("bonus reroll raises the selection size for this turn only", () => {
    start();
    useBattleStore.setState({ charge: 5 });
    useBattleStore.getState().spendBonusReroll();
    let s = useBattleStore.getState();
    expect(s.charge).toBe(0);
    expect(s.rerollSize).toBe(3);
    useBattleStore.getState().endTurn();
    finish();
    s = useBattleStore.getState();
    expect(s.rerollSize).toBe(2);
  });

  it("surge affects exactly the next roll", () => {
    start(11);
    useBattleStore.setState({ charge: 10 });
    useBattleStore.getState().spendSurge();
    expect(useBattleStore.getState().nextRollBonus).toBe(1);
    useBattleStore.getState().endTurn();
    finish();
    const boosted = useBattleStore.getState().dice.map((d) => d.value);

    start(11);
    useBattleStore.getState().endTurn();
    finish();
    const control = useBattleStore.getState().dice.map((d) => d.value);
    const tiers = useBattleStore.getState().dice.map((d) => d.tier);

    expect(boosted).toEqual(
      control.map((v, i) => Math.min(tiers[i] ?? 6, v + 1)),
    );
    expect(useBattleStore.getState().nextRollBonus).toBe(0);
  });

  it("rejects spends the charge cannot afford", () => {
    start();
    useBattleStore.setState({ charge: 2 });
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.getState().spendNudge(uid, 1);
    useBattleStore.getState().spendBonusReroll();
    useBattleStore.getState().spendSurge();
    const s = useBattleStore.getState();
    expect(s.charge).toBe(2);
    expect(s.rerollSize).toBe(2);
    expect(s.nextRollBonus).toBe(0);
  });
});

describe("reroll flow", () => {
  it("rerolls up to rerollSize tray dice once per turn", () => {
    start(3);
    const before = useBattleStore.getState().dice.map((d) => d.value);
    const [a, b, c] = useBattleStore.getState().dice;
    useBattleStore.getState().toggleRerollMode();
    useBattleStore.getState().toggleRerollDie(a?.uid ?? "");
    useBattleStore.getState().toggleRerollDie(b?.uid ?? "");
    useBattleStore.getState().toggleRerollDie(c?.uid ?? "");
    expect(useBattleStore.getState().rerollSelection).toHaveLength(2);
    useBattleStore.getState().confirmReroll();
    const s = useBattleStore.getState();
    expect(s.rerollsLeft).toBe(0);
    expect(s.rerollMode).toBe(false);
    expect(s.dice[2]?.value).toBe(before[2]);
    useBattleStore.getState().toggleRerollMode();
    expect(useBattleStore.getState().rerollMode).toBe(false);
  });

  it("reroll values are deterministic per seed", () => {
    const run = () => {
      start(9);
      const [a, b] = useBattleStore.getState().dice;
      useBattleStore.getState().toggleRerollMode();
      useBattleStore.getState().toggleRerollDie(a?.uid ?? "");
      useBattleStore.getState().toggleRerollDie(b?.uid ?? "");
      useBattleStore.getState().confirmReroll();
      return useBattleStore.getState().dice.map((d) => d.value);
    };
    expect(run()).toEqual(run());
  });
});

describe("targeting", () => {
  it("routes weapon damage to the tapped enemy", () => {
    start(42, ["raider", "scavDrone"]);
    const second = useBattleStore.getState().enemies[1];
    useBattleStore.getState().setTarget(second?.id ?? "");
    expect(useBattleStore.getState().targetId).toBe(second?.id);
    const die = useBattleStore
      .getState()
      .dice.find((d) => d.state === "tray" && d.tier <= 8);
    useBattleStore.getState().placeDie(die?.uid ?? "", "weaponA");
    useBattleStore.getState().endTurn();
    finish();
    const s = useBattleStore.getState();
    const raider = s.enemies[0];
    const drone = s.enemies[1];
    expect(raider?.hp).toBe(raider?.hpMax);
    expect((drone?.hpMax ?? 0) - (drone?.hp ?? 0)).toBeGreaterThan(0);
  });

  it("ignores taps on dead enemies", () => {
    start(42, ["raider", "scavDrone"]);
    const second = useBattleStore.getState().enemies[1];
    useBattleStore.setState((s) => ({
      enemies: s.enemies.map((e, i) => (i === 1 ? { ...e, hp: 0 } : e)),
    }));
    useBattleStore.getState().setTarget(second?.id ?? "");
    expect(useBattleStore.getState().targetId).toBe(
      useBattleStore.getState().enemies[0]?.id,
    );
  });
});

describe("resolution flow", () => {
  it("endTurn enters resolving and finishResolution lands the next turn", () => {
    start();
    useBattleStore.getState().endTurn();
    let s = useBattleStore.getState();
    expect(s.phase).toBe("resolving");
    expect(s.resolution).not.toBeNull();
    expect(s.beatSeq).toBe(1);
    finish();
    s = useBattleStore.getState();
    expect(s.phase).toBe("placement");
    expect(s.turn).toBe(2);
    expect(s.resolution).toBeNull();
    expect(s.rerollsLeft).toBe(1);
  });

  it("beat-by-beat application and skip land the identical final state", () => {
    const playBeats = () => {
      start(1337);
      const dice = useBattleStore.getState().dice;
      const small = dice.find((d) => d.state === "tray");
      if (small !== undefined) {
        useBattleStore.getState().placeDie(small.uid, "weaponA");
      }
      const next = dice.find((d) => d.state === "tray" && d.uid !== small?.uid);
      if (next !== undefined) {
        useBattleStore.getState().placeDie(next.uid, "shields");
      }
      useBattleStore.getState().endTurn();
      return useBattleStore.getState().resolution;
    };

    const bundleA = playBeats();
    for (const beat of bundleA?.beats ?? []) {
      useBattleStore.getState().applyBeatSnapshot(beat.after);
    }
    for (const beat of bundleA?.enemyBeats ?? []) {
      useBattleStore.getState().applyBeatSnapshot(beat.after);
    }
    finish();
    const viaBeats = materialValues(useBattleStore.getState());

    playBeats();
    finish();
    const viaSkip = materialValues(useBattleStore.getState());

    expect(viaBeats).toEqual(viaSkip);
  });

  it("kills the enemy and ends the battle with victory", () => {
    start();
    useBattleStore.setState((s) => ({
      enemies: s.enemies.map((e) => ({ ...e, hp: 2 })),
      dice: s.dice.map((d, i) => (i === 0 ? { ...d, value: 5 } : d)),
    }));
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.getState().placeDie(uid, "weaponA");
    useBattleStore.getState().endTurn();
    finish();
    const s = useBattleStore.getState();
    expect(s.phase).toBe("ended");
    expect(s.outcome).toBe("victory");
    expect(s.enemies[0]?.hp).toBe(0);
  });

  it("loses when hull reaches 0", () => {
    start();
    useBattleStore.setState({ hull: 3 });
    useBattleStore.getState().endTurn();
    finish();
    const s = useBattleStore.getState();
    expect(s.phase).toBe("ended");
    expect(s.outcome).toBe("defeat");
    expect(s.hull).toBe(0);
  });

  it("mirrors deep scan into the run store", () => {
    start();
    const d6 = useBattleStore.getState().dice.find((d) => d.tier === 6);
    const uid = d6?.uid ?? "";
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => (d.uid === uid ? { ...d, value: 6 } : d)),
    }));
    useBattleStore.getState().placeDie(uid, "sensors");
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => (d.uid === uid ? { ...d, value: 7 } : d)),
    }));
    useBattleStore.getState().endTurn();
    finish();
    expect(useRunStore.getState().pendingDeepScan).toBe(true);
    expect(useBattleStore.getState().pendingDeepScan).toBe(false);
  });

  it("blocks placement during resolving", () => {
    start();
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.getState().endTurn();
    useBattleStore.getState().placeDie(uid, "weaponA");
    expect(useBattleStore.getState().slots.weaponA?.dieUid).toBeUndefined();
    finish();
  });

  it("applies debugNextRoll to the next roll then clears it", () => {
    start();
    useBattleStore.setState({ debugNextRoll: [1, 2, 3, 4, 4] });
    useBattleStore.getState().endTurn();
    finish();
    const s = useBattleStore.getState();
    expect(s.dice.map((d) => d.value)).toEqual([1, 2, 3, 4, 4]);
    expect(s.debugNextRoll).toBeNull();
  });

  it("debugNextRoll does not clobber a reserved die's carried value", () => {
    start();
    const first = useBattleStore.getState().dice[0];
    const uid = first?.uid ?? "";
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => (d.uid === uid ? { ...d, value: 6 } : d)),
    }));
    useBattleStore.getState().reserveDie(uid);
    useBattleStore.setState({ debugNextRoll: [1, 1, 1, 1, 1] });
    useBattleStore.getState().endTurn();
    finish();
    const kept = useBattleStore.getState().dice.find((d) => d.uid === uid);
    expect(kept?.state).toBe("tray");
    expect(kept?.value).toBe(6);
  });
});
