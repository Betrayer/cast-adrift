import { describe, expect, it } from "vitest";
import { harnessDie, harnessSnap } from "@/game/battle/battleHarness";
import {
  INVERTED_RESOLUTION_ORDER,
  isInverted,
  RESOLUTION_ORDER,
  resolutionOrder,
} from "@/game/battle/order";
import {
  advanceTurn,
  applyNodeStorm,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import { createStream, createStreams } from "@/services/rng";
import type { BattleSnapshot, RolledDie, SlotId } from "@/types/battle";

const place = (
  snapshot: BattleSnapshot,
  uid: string,
  slot: SlotId,
): BattleSnapshot => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  if (die === undefined) throw new Error(`no die ${uid}`);
  die.state = "placed";
  die.slot = slot;
  const slotState = snapshot.slots[slot];
  if (slotState !== undefined) slotState.dieUid = uid;
  return snapshot;
};

const withSlots = (over: Partial<BattleSnapshot>, dice: RolledDie[]) =>
  harnessSnap(dice, {
    slots: {
      weaponA: { cap: 8, mk: 1 },
      weaponB: { cap: 8, mk: 1 },
      spinal: { cap: 12, mk: 1, jamOn: 4 },
      shields: { cap: 8, mk: 1 },
      shieldsB: { cap: 8, mk: 1 },
      engines: { cap: 6, mk: 1 },
      sensors: { cap: 6, mk: 1 },
      reactor: { cap: 10, mk: 1 },
      repairBay: { cap: 8, mk: 1 },
    },
    ...over,
  });

describe("resolution order", () => {
  it("is the same list read backwards, with every slot present exactly once", () => {
    expect([...INVERTED_RESOLUTION_ORDER].reverse()).toEqual(RESOLUTION_ORDER);
    expect(new Set(INVERTED_RESOLUTION_ORDER).size).toBe(
      RESOLUTION_ORDER.length,
    );
  });

  it("XORs the node's inversion with a fold, so a fold inside one cancels it", () => {
    expect(isInverted({})).toBe(false);
    expect(isInverted({ inverted: true })).toBe(true);
    expect(isInverted({ foldedTurns: 2 })).toBe(true);
    expect(isInverted({ inverted: true, foldedTurns: 2 })).toBe(false);
    expect(resolutionOrder({ inverted: true })).toBe(INVERTED_RESOLUTION_ORDER);
    expect(resolutionOrder({})).toBe(RESOLUTION_ORDER);
  });

  it("resolves the reactor before the guns and the sensors last", () => {
    const dice = [
      harnessDie("d0", "red-d6", 6),
      harnessDie("d1", "grey-d4", 4),
    ];
    const snapshot = withSlots({ inverted: true }, dice);
    place(snapshot, "d0", "weaponA");
    place(snapshot, "d1", "sensors");
    const { beats } = resolvePlayerPhase(snapshot);
    expect(beats.map((b) => b.slot)).toEqual(["weaponA", "sensors"]);
  });

  it("makes a sensor mark useless on an inverted row", () => {
    const build = (inverted: boolean): number => {
      const dice = [
        harnessDie("d0", "red-d6", 6),
        harnessDie("d1", "grey-d4", 4),
      ];
      const snapshot = withSlots({ inverted }, dice);
      place(snapshot, "d0", "weaponA");
      place(snapshot, "d1", "sensors");
      const { beats } = resolvePlayerPhase(snapshot);
      return beats.find((b) => b.kind === "damage")?.amount ?? 0;
    };
    expect(build(false)).toBeGreaterThan(build(true));
  });

  it("spends the engine tier a turn late and the repair bay first", () => {
    const dice = [
      harnessDie("d0", "blue-d6", 6),
      harnessDie("d1", "green-d4", 4),
    ];
    const snapshot = withSlots({ inverted: true, hull: 20 }, dice);
    place(snapshot, "d0", "engines");
    place(snapshot, "d1", "repairBay");
    const { beats, next } = resolvePlayerPhase(snapshot);
    expect(beats.map((b) => b.slot)).toEqual(["repairBay", "engines"]);
    expect(next.engineState).toBe("dodge");
  });

  it("keeps the spinal jam rule intact when the order flips", () => {
    const dice = [harnessDie("d0", "red-d6", 2)];
    const snapshot = withSlots({ inverted: true }, dice);
    place(snapshot, "d0", "spinal");
    const { beats } = resolvePlayerPhase(snapshot);
    expect(beats[0]?.kind).toBe("spinalJam");
  });

  it("expires a fold after exactly one player phase", () => {
    const dice = [harnessDie("d0", "red-d6", 3)];
    const snapshot = withSlots({ foldedTurns: 2 }, dice);
    expect(isInverted(snapshot)).toBe(true);
    const turned = advanceTurn(snapshot, createStreams(5));
    expect(turned.foldedTurns).toBe(1);
    expect(isInverted(turned)).toBe(true);
    const later = advanceTurn(turned, createStreams(6));
    expect(later.foldedTurns).toBe(0);
    expect(isInverted(later)).toBe(false);
  });
});

describe("probability storm", () => {
  it("re-rolls exactly one placed die, and the same one for the same seed", () => {
    const build = (): BattleSnapshot => {
      const dice = [
        harnessDie("d0", "red-d6", 6),
        harnessDie("d1", "blue-d6", 6),
        harnessDie("d2", "grey-d4", 4),
      ];
      const snapshot = withSlots({ nodeStorm: true }, dice);
      place(snapshot, "d0", "weaponA");
      place(snapshot, "d1", "shields");
      return snapshot;
    };
    const a = build();
    const b = build();
    const beatA = applyNodeStorm(a, createStream(99));
    const beatB = applyNodeStorm(b, createStream(99));
    expect(beatA).not.toBeNull();
    expect(beatA?.kind).toBe("storm");
    expect(beatA?.slot).toBe(beatB?.slot);
    const changed = a.dice.filter((d, i) => d.value !== build().dice[i]?.value);
    expect(changed.length).toBeLessThanOrEqual(1);
    expect(a.dice.find((d) => d.uid === "d2")?.value).toBe(4);
  });

  it("does nothing on an ordinary node or with nothing placed", () => {
    const dice = [harnessDie("d0", "red-d6", 6)];
    expect(applyNodeStorm(withSlots({}, dice), createStream(1))).toBeNull();
    expect(
      applyNodeStorm(withSlots({ nodeStorm: true }, dice), createStream(1)),
    ).toBeNull();
  });

  it("emits its beat before every slot beat", () => {
    const dice = [harnessDie("d0", "red-d6", 6)];
    const snapshot = withSlots({ nodeStorm: true }, dice);
    place(snapshot, "d0", "weaponA");
    const { beats } = resolvePlayerPhase(snapshot, createStream(7));
    expect(beats[0]?.kind).toBe("storm");
    expect(beats.some((b) => b.kind === "damage")).toBe(true);
  });
});

describe("causality intents", () => {
  it("«Складка» buys one inverted player phase", () => {
    const dice = [harnessDie("d0", "red-d6", 3)];
    const snapshot = withSlots(
      { enemies: [], turn: 1 },
      dice,
    );
    snapshot.enemies = [
      {
        id: "enemy-0",
        defId: "foldWraith",
        hp: 24,
        hpMax: 24,
        shield: 0,
        intentIndex: 0,
        nextIntent: { t: "foldOrder" },
        statuses: {},
        subsystems: [],
        phase: 0,
      },
    ];
    snapshot.targetId = "enemy-0";
    const { next, beats } = resolveEnemyPhase(snapshot, createStream(3));
    expect(beats.some((b) => b.kind === "fold")).toBe(true);
    expect(next.foldedTurns).toBe(2);
    expect(isInverted(advanceTurn(next, createStreams(4)))).toBe(true);
  });

  it("«Пожиратель вероятностей» eats the best tray die into its shield", () => {
    const dice = [
      harnessDie("d0", "red-d6", 6),
      harnessDie("d1", "blue-d6", 2),
    ];
    const snapshot = withSlots({}, dice);
    snapshot.enemies = [
      {
        id: "enemy-0",
        defId: "oddsEater",
        hp: 26,
        hpMax: 26,
        shield: 0,
        intentIndex: 0,
        nextIntent: { t: "devourDie" },
        statuses: {},
        subsystems: [],
        phase: 0,
      },
    ];
    snapshot.targetId = "enemy-0";
    const { next, beats } = resolveEnemyPhase(snapshot, createStream(3));
    expect(beats.find((b) => b.kind === "devour")?.amount).toBe(6);
    expect(next.enemies[0]?.shield).toBe(6);
    expect(next.dice.find((d) => d.uid === "d0")?.value).toBe(1);
    expect(next.dice.find((d) => d.uid === "d1")?.value).toBe(2);
  });

  it("«Ретро-эхо» bills the last turn back, capped, and nothing on a quiet one", () => {
    const build = (lastPlayerDamage: number): BattleSnapshot => {
      const snapshot = withSlots({ lastPlayerDamage, hull: 60, hullMax: 60 }, []);
      snapshot.enemies = [
        {
          id: "enemy-0",
          defId: "retroEcho",
          hp: 22,
          hpMax: 22,
          shield: 0,
          intentIndex: 0,
          nextIntent: { t: "echoTotal", cap: 14 },
          statuses: {},
          subsystems: [],
          phase: 0,
        },
      ];
      snapshot.targetId = "enemy-0";
      return snapshot;
    };
    const quiet = resolveEnemyPhase(build(0), createStream(3));
    expect(quiet.next.hull).toBe(60);
    const loud = resolveEnemyPhase(build(40), createStream(3));
    expect(60 - loud.next.hull).toBe(14);
  });
});
