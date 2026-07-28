import { describe, expect, it } from "vitest";
import { SHIP_BY_ID } from "@/data/ships";
import {
  buildBattleSnapshot,
  createEnemyStream,
  dieFitsSlot,
} from "@/game/battle/setup";
import { resolveEnemyPhase, resolvePlayerPhase } from "@/game/battle/resolver";
import { createStreams } from "@/services/rng";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";
import type { BattleSnapshot } from "@/types/battle";
import type { ShipId } from "@/data/ships";

const snapFor = (
  shipId: ShipId,
  deck: string[],
  hull?: number,
): BattleSnapshot => {
  const streams = createStreams(1);
  const enemyStream = createEnemyStream(streams);
  return buildBattleSnapshot(shipId, deck, ["raider"], streams, enemyStream, {}, {
    hull,
  });
};

describe("ship boards", () => {
  it("each ship exposes the correct slot board", () => {
    expect(Object.keys(snapFor("wanderer", ["red-d6"]).slots).sort()).toEqual([
      "engines",
      "reactor",
      "sensors",
      "shields",
      "weaponA",
      "weaponB",
    ]);
    expect(Object.keys(snapFor("ram", ["red-d6"]).slots).sort()).toEqual([
      "engines",
      "reactor",
      "shields",
      "spinal",
      "weaponA",
      "weaponB",
    ]);
    expect(Object.keys(snapFor("ark", ["red-d6"]).slots).sort()).toEqual([
      "engines",
      "reactor",
      "repairBay",
      "shields",
      "shieldsB",
      "weaponA",
    ]);
  });

  it("declares the design passives", () => {
    expect(SHIP_BY_ID.get("wanderer")?.passive).toEqual({
      kind: "scrapper",
      scrap: 2,
    });
    expect(SHIP_BY_ID.get("ram")?.passive?.kind).toBe("overload");
    expect(SHIP_BY_ID.get("ark")?.passive?.kind).toBe("bulwark");
    expect(SHIP_BY_ID.get("ram")?.hullMax).toBe(34);
    expect(SHIP_BY_ID.get("ark")?.hullMax).toBe(28);
  });
});

describe("RepairBay resolver", () => {
  it("heals ceil(V/2) and resolves last, clamped to hullMax", () => {
    const snap = snapFor("ark", ["green-d4"], 10);
    const die = snap.dice[0];
    expect(die).toBeDefined();
    if (die === undefined) return;
    die.value = 4;
    die.state = "placed";
    die.slot = "repairBay";
    const repairBay = snap.slots.repairBay;
    expect(repairBay).toBeDefined();
    if (repairBay !== undefined) repairBay.dieUid = die.uid;
    const { next, beats } = resolvePlayerPhase(snap);
    expect(next.hull).toBe(12);
    expect(beats.some((b) => b.kind === "repair" && b.amount === 2)).toBe(true);
  });
});

describe("Overload (Ram)", () => {
  it("lets a Ram exceed a weapon-slot cap; a Wanderer cannot", () => {
    const ram = snapFor("ram", ["red-d6"]);
    const wanderer = snapFor("wanderer", ["red-d6"]);
    const bigDie = { tier: 12 as const, school: "red" as const };
    expect(dieFitsSlot(ram, bigDie, { cap: 8 }, "weaponA")).toBe(true);
    expect(dieFitsSlot(ram, bigDie, { cap: 8 }, "shields")).toBe(false);
    expect(dieFitsSlot(wanderer, bigDie, { cap: 8 }, "weaponA")).toBe(false);
  });

  it("charges 2 hull when a Ram fires an over-cap weapon die", () => {
    const snap = snapFor("ram", ["coreshard"], 30);
    const die = snap.dice[0];
    expect(die).toBeDefined();
    if (die === undefined) return;
    die.value = 6;
    die.state = "placed";
    die.slot = "weaponA";
    const weaponA = snap.slots.weaponA;
    if (weaponA !== undefined) weaponA.dieUid = die.uid;
    const before = snap.hull;
    const { next } = resolvePlayerPhase(snap);
    expect(next.hull).toBe(before - 2);
  });
});

describe("Bulwark (Ark)", () => {
  it("keeps 25% of the shield at end of enemy turn; other ships lose all", () => {
    const ark = snapFor("ark", ["blue-d6"]);
    ark.shield = 8;
    ark.enemies.forEach((e) => (e.hp = 0));
    const arkStream = createStreams(2).dice;
    const arkNext = resolveEnemyPhase(ark, arkStream).next;
    expect(arkNext.shield).toBe(2);

    const wanderer = snapFor("wanderer", ["blue-d6"]);
    wanderer.shield = 8;
    wanderer.enemies.forEach((e) => (e.hp = 0));
    const wandererNext = resolveEnemyPhase(
      wanderer,
      createStreams(2).dice,
    ).next;
    expect(wandererNext.shield).toBe(0);
  });

  it("recomputes the floor from the current shield each turn (no ratchet)", () => {
    const ark = snapFor("ark", ["blue-d6"]);
    ark.shield = 20;
    ark.enemies.forEach((e) => (e.hp = 0));
    const t1 = resolveEnemyPhase(ark, createStreams(2).dice).next;
    expect(t1.shield).toBe(5);
    t1.shield = 4;
    const t2 = resolveEnemyPhase(t1, createStreams(2).dice).next;
    expect(t2.shield).toBe(1);
  });
});

describe("Single Cast (grey keystone)", () => {
  it("keeps rerolls disabled on every placement phase, not just turn 1", () => {
    useRunStore.getState().reset();
    const snap = snapFor("wanderer", ["red-d6", "blue-d6", "green-d4"]);
    useBattleStore.setState({
      chartPicks: ["grey-key1"],
      perks: [],
      rerollBase: 2,
      phase: "resolving",
      resolution: {
        beats: [],
        enemyBeats: [],
        final: snap,
        finalPhase: "placement",
      },
    });
    useBattleStore.getState().finishResolution();
    expect(useBattleStore.getState().rerollsLeft).toBe(0);

    useBattleStore.setState({
      chartPicks: [],
      phase: "resolving",
      resolution: {
        beats: [],
        enemyBeats: [],
        final: snap,
        finalPhase: "placement",
      },
    });
    useBattleStore.getState().finishResolution();
    expect(useBattleStore.getState().rerollsLeft).toBe(1);
    useBattleStore.getState().reset();
  });
});

describe("Scrapper (Wanderer)", () => {
  it("seeds +2 scrap at battle start", () => {
    useRunStore.getState().reset();
    const streams = createStreams(3);
    useBattleStore.getState().startBattle(
      { enemyIds: ["raider"], shipId: "wanderer", perks: [], chartPicks: [] },
      ["red-d6"],
      streams,
    );
    expect(useBattleStore.getState().scrap).toBe(2);
    useBattleStore.getState().reset();
  });
});
