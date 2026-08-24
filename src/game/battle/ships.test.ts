import { describe, expect, it } from "vitest";
import { PLAYABLE_SHIPS, SHIP_BY_ID } from "@/data/ships";
import {
  canFuse,
  canReschool,
  fusedDie,
  growTier,
  isFuseTarget,
} from "@/game/battle/actives";
import { passiveActionOf, shipProfile } from "@/game/battle/passives";
import { RESOLUTION_ORDER } from "@/game/battle/order";
import { featureRoutes } from "@/game/meta/describeUnlock";
import type { SlotId } from "@/types/battle";
import {
  buildBattleSnapshot,
  createEnemyStream,
  dieFitsSlot,
} from "@/game/battle/setup";
import {
  advanceTurn,
  evasionFor,
  evasionTuningFor,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import { createStreams } from "@/services/rng";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";
import type { BattleSnapshot, RolledDie } from "@/types/battle";
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
    expect(Object.keys(snapFor("corsair", ["red-d6"]).slots).sort()).toEqual([
      "engines",
      "enginesB",
      "reactor",
      "sensors",
      "weaponA",
      "weaponB",
    ]);
    expect(Object.keys(snapFor("foundry", ["red-d6"]).slots).sort()).toEqual([
      "engines",
      "reactor",
      "shields",
      "weaponA",
      "weaponB",
    ]);
    expect(Object.keys(snapFor("prism", ["red-d6"]).slots).sort()).toEqual([
      "engines",
      "reactor",
      "sensors",
      "shields",
      "weaponA",
      "weaponB",
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
    expect(SHIP_BY_ID.get("corsair")?.passive?.kind).toBe("afterburner");
    expect(SHIP_BY_ID.get("foundry")?.passive?.kind).toBe("annealer");
    expect(SHIP_BY_ID.get("prism")?.passive?.kind).toBe("refractor");
    expect(SHIP_BY_ID.get("corsair")?.hullMax).toBe(30);
    expect(SHIP_BY_ID.get("foundry")?.hullMax).toBe(32);
    expect(SHIP_BY_ID.get("prism")?.hullMax).toBe(28);
  });

  it("routes every passive through one registry entry", () => {
    expect(shipProfile("wanderer").battleStartScrap).toBe(2);
    expect(shipProfile("ram").overCap?.hullCost).toBe(2);
    expect(shipProfile("ark").shieldKeepPct).toBe(25);
    expect(shipProfile("corsair").afterburner).toEqual({ weapons: 1, cap: 2 });
    expect(shipProfile("corsair").evasion).toEqual({
      delta: 10,
      dodgeCap: 70,
      glancingCap: 30,
    });
    expect(shipProfile("wanderer").evasion).toBeNull();
    expect(shipProfile("foundry").fuseTierStep).toBe(1);
    expect(shipProfile("prism").prismaticCensusMult).toBe(2);
    expect(passiveActionOf("foundry")).toBe("fuse");
    expect(passiveActionOf("prism")).toBe("reschool");
    expect(passiveActionOf("wanderer")).toBeNull();
  });

  it("keeps every ship board legal for the arc and dock layouts", () => {
    for (const def of PLAYABLE_SHIPS) {
      const ids = Object.keys(def.slots) as SlotId[];
      expect(ids.length).toBeGreaterThanOrEqual(5);
      expect(ids.length).toBeLessThanOrEqual(6);
      for (const id of ids) expect(RESOLUTION_ORDER).toContain(id);
    }
  });

  it("gives every purchasable ship an unlock feature", () => {
    for (const def of PLAYABLE_SHIPS) {
      if (def.price === 0) continue;
      expect(def.unlock).toBeDefined();
      if (def.unlock !== undefined) {
        expect(featureRoutes(def.unlock).length).toBeGreaterThan(0);
      }
    }
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

describe("Afterburner (Hound)", () => {
  const placeEngines = (
    snap: BattleSnapshot,
    slotId: "engines" | "enginesB",
    value: number,
    index: number,
  ): void => {
    const die = snap.dice[index];
    if (die === undefined) return;
    die.value = value;
    die.state = "placed";
    die.slot = slotId;
    const slot = snap.slots[slotId];
    if (slot !== undefined) slot.dieUid = die.uid;
  };

  it("reads both engine slots as one manoeuvre", () => {
    const snap = snapFor("corsair", ["green-d4", "green-d4"]);
    placeEngines(snap, "engines", 3, 0);
    placeEngines(snap, "enginesB", 4, 1);
    const { next, beats } = resolvePlayerPhase(snap);
    const engineBeats = beats.filter((b) => b.kind === "engine");
    expect(engineBeats).toHaveLength(2);
    expect(next.evasion).toEqual(
      evasionFor(7 + 2 + 2, 0, evasionTuningFor("corsair")),
    );
    expect(next.evasion?.dodgePct).toBeGreaterThan(
      evasionFor(7 + 2 + 2).dodgePct,
    );
  });

  it("grants Weapons on a dodge, capped at +2 for the enemy turn", () => {
    const snap = snapFor("corsair", ["green-d4"]);
    snap.evasion = { dodgePct: 100, glancingPct: 0, intercept: false };
    snap.hull = 40;
    snap.hullMax = 40;
    const { next } = resolveEnemyPhase(snap, createStreams(5).dice);
    expect(next.nextTurnMods.weapons).toBe(2);
  });

  it("grants nothing to a ship without the passive", () => {
    const snap = snapFor("wanderer", ["green-d4"]);
    snap.evasion = { dodgePct: 100, glancingPct: 0, intercept: false };
    snap.hull = 40;
    snap.hullMax = 40;
    const { next } = resolveEnemyPhase(snap, createStreams(5).dice);
    expect(next.nextTurnMods.weapons ?? 0).toBe(0);
  });
});

describe("Anneal (Forge)", () => {
  const start = (shipId: ShipId, deck: string[]): void => {
    useRunStore.getState().reset();
    useBattleStore
      .getState()
      .startBattle(
        { enemyIds: ["raider"], shipId, perks: [], chartPicks: [] },
        deck,
        createStreams(9),
      );
  };

  it("grows a tier and carries both values, once per battle", () => {
    start("foundry", ["red-d6", "red-d6", "blue-d6"]);
    const store = useBattleStore.getState();
    const [a, b] = store.dice;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    if (a === undefined || b === undefined) return;
    useBattleStore.setState({
      dice: store.dice.map((d) =>
        d.uid === a.uid || d.uid === b.uid ? { ...d, value: 3 } : d,
      ),
    });
    useBattleStore.getState().beginFuse(a.uid);
    expect(useBattleStore.getState().fuseSourceUid).toBe(a.uid);
    useBattleStore.getState().fuseDice(b.uid);
    const after = useBattleStore.getState();
    expect(after.passiveUsed).toBe(true);
    const fused = after.dice.find((d) => d.temp === true);
    expect(fused?.tier).toBe(8);
    expect(fused?.value).toBe(6);
    expect(after.dice.filter((d) => d.state === "burned")).toHaveLength(2);

    const third = after.dice.find((d) => d.state === "tray" && d.temp !== true);
    if (third !== undefined) {
      useBattleStore.getState().beginFuse(third.uid);
      expect(useBattleStore.getState().fuseSourceUid).toBeNull();
    }
    useBattleStore.getState().reset();
  });

  it("refuses a ship without the passive", () => {
    start("wanderer", ["red-d6", "red-d6"]);
    const store = useBattleStore.getState();
    const [a, b] = store.dice;
    if (a === undefined || b === undefined) return;
    useBattleStore.setState({
      dice: store.dice.map((d) => ({ ...d, value: 4 })),
    });
    useBattleStore.getState().beginFuse(a.uid);
    useBattleStore.getState().fuseDice(b.uid);
    expect(useBattleStore.getState().passiveUsed).toBe(false);
    useBattleStore.getState().reset();
  });

  it("only pairs equal values and never reaches past d20", () => {
    const die = (value: number, tier: 6 | 20): RolledDie => ({
      uid: `u${String(value)}${String(tier)}`,
      defId: "red-d6",
      tier,
      school: "red",
      value,
      state: "tray",
    });
    expect(isFuseTarget(die(3, 6), die(4, 6))).toBe(false);
    expect(isFuseTarget(die(3, 6), die(3, 6))).toBe(false);
    expect(canFuse({ ...die(3, 6), state: "placed" })).toBe(false);
    expect(growTier(20, 1)).toBe(20);
    expect(fusedDie(die(6, 6), { ...die(6, 6), uid: "other" }, 1).value).toBe(8);
  });
});

describe("Refractor (Prism)", () => {
  it("counts prismatic dice twice in the census", () => {
    const single = snapFor("wanderer", ["prismChip", "red-d6"]);
    const doubled = snapFor("prism", ["prismChip", "red-d6"]);
    expect(doubled.resonance.counts.red).toBe(
      single.resonance.counts.red + 1,
    );
  });

  it("turns one placed die prismatic for the turn, once per battle", () => {
    useRunStore.getState().reset();
    useBattleStore
      .getState()
      .startBattle(
        { enemyIds: ["raider"], shipId: "prism", perks: [], chartPicks: [] },
        ["blue-d6", "blue-d6"],
        createStreams(4),
      );
    const first = useBattleStore.getState().dice[0];
    if (first === undefined) return;
    useBattleStore.getState().placeDie(first.uid, "weaponA");
    useBattleStore.getState().reschoolDie(first.uid);
    const after = useBattleStore.getState();
    expect(after.passiveUsed).toBe(true);
    expect(after.dice.find((d) => d.uid === first.uid)?.school).toBe(
      "prismatic",
    );

    const second = after.dice[1];
    if (second !== undefined) {
      useBattleStore.getState().placeDie(second.uid, "shields");
      useBattleStore.getState().reschoolDie(second.uid);
      expect(
        useBattleStore.getState().dice.find((d) => d.uid === second.uid)?.school,
      ).toBe("blue");
    }
    useBattleStore.getState().reset();
  });

  it("restores the authored school when the turn rolls over", () => {
    const snap = snapFor("prism", ["blue-d6"]);
    const die = snap.dice[0];
    if (die === undefined) return;
    die.school = "prismatic";
    die.reschooled = true;
    const next = advanceTurn(snap, createStreams(6));
    expect(next.dice[0]?.school).toBe("blue");
    expect(next.dice[0]?.reschooled).toBeUndefined();
  });

  it("takes a die from the tray or a slot, but never a prismatic one", () => {
    const die = (
      state: "tray" | "placed" | "burned",
      school: "blue" | "prismatic",
    ): RolledDie => ({
      uid: "x",
      defId: "blue-d6",
      tier: 6,
      school,
      value: 3,
      state,
    });
    expect(canReschool(die("tray", "blue"))).toBe(true);
    expect(canReschool(die("placed", "blue"))).toBe(true);
    expect(canReschool(die("burned", "blue"))).toBe(false);
    expect(canReschool(die("tray", "prismatic"))).toBe(false);
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
