import { describe, expect, it } from "vitest";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { FATE_DIE_ID } from "@/data/fate";
import { harnessSnap } from "@/game/battle/battleHarness";
import { advanceTurn } from "@/game/battle/resolver";
import {
  applyObsidianPact,
  buildBattleSnapshot,
  createEnemyStream,
  dealHand,
} from "@/game/battle/setup";
import {
  assignSeats,
  bySeat,
  drawFromBag,
  isOnTable,
  seatCount,
  tableDice,
  tableSeats,
} from "@/game/battle/table";
import { adjacentCopyValue, isSwapTarget } from "@/game/battle/actives";
import { BattleCtx, dieFaceMax, dieFaceMin } from "@/game/effects/context";
import { applyActions, applyDefs } from "@/game/effects/evaluate";
import { buildSources, emit } from "@/game/effects/pipeline";
import { TABLE_SIZE } from "@/game/economy/prices";
import {
  createStream,
  createStreams,
  restoreStreams,
  serializeStreams,
} from "@/services/rng";
import type { BattleSnapshot, RolledDie } from "@/types/battle";

const SMALL_HAND = ["red-d6", "blue-d6", "green-d4", "grey-d4", "ember", "frostplate"];

const BIG_HAND = [
  "red-d6",
  "red-d6",
  "blue-d6",
  "blue-d6",
  "green-d4",
  "green-d4",
  "grey-d4",
  "grey-d4",
  "ember",
  "frostplate",
  "sprout",
  "ashen",
  "cinder",
  "slug",
  "flare",
];

const build = (hand: readonly string[], seed: number): BattleSnapshot => {
  const streams = createStreams(seed);
  return buildBattleSnapshot(
    "wanderer",
    hand,
    ["raider"],
    streams,
    createEnemyStream(streams),
  );
};

const legacyRoll = (hand: readonly string[], seed: number): number[] => {
  const streams = createStreams(seed);
  return hand.map((defId) => {
    const def = DIE_BY_ID.get(defId);
    if (def === undefined) throw new Error(defId);
    return rollBaseValue(defId, def.tier, streams.dice);
  });
};

const onTableCount = (snapshot: BattleSnapshot): number =>
  snapshot.dice.filter((die) => isOnTable(die) && die.defId !== FATE_DIE_ID)
    .length;

describe("the table at battle start", () => {
  it("rolls a hand of seven or fewer exactly as the whole-deck roll did", () => {
    for (const seed of [1, 7, 42, 99, 1234]) {
      const dealt = dealHand(SMALL_HAND, createStreams(seed));
      expect(dealt.map((die) => die.state)).toEqual(SMALL_HAND.map(() => "tray"));
      expect(dealt.map((die) => die.uid)).toEqual(
        SMALL_HAND.map((_, index) => `die-${String(index)}`),
      );
      expect(dealt.map((die) => die.seat)).toEqual(SMALL_HAND.map((_, index) => index));
      expect(dealt.map((die) => die.value)).toEqual(legacyRoll(SMALL_HAND, seed));
    }
  });

  it("draws seven of a fifteen-die hand and leaves the rest in the bag", () => {
    const snapshot = build(BIG_HAND, 11);
    expect(snapshot.dice).toHaveLength(15);
    expect(onTableCount(snapshot)).toBe(TABLE_SIZE);
    expect(snapshot.dice.filter((die) => die.state === "bag")).toHaveLength(8);
    const seats = [...tableSeats(snapshot.dice).values()].sort((a, b) => a - b);
    expect(seats).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const die of snapshot.dice.filter((d) => d.state === "bag")) {
      expect(die.value).toBe(0);
      expect(die.seat).toBeUndefined();
    }
  });

  it("draws the same seven for the same seed and different sevens across seeds", () => {
    const picked = (seed: number): string =>
      build(BIG_HAND, seed)
        .dice.filter(isOnTable)
        .map((die) => die.uid)
        .join(",");
    expect(picked(5)).toBe(picked(5));
    const variety = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(picked));
    expect(variety.size).toBeGreaterThan(1);
  });

  it("keeps the Fate die on the table outside the seven seats", () => {
    const hand = [...BIG_HAND.slice(0, 14), FATE_DIE_ID];
    for (const seed of [3, 4, 5]) {
      const snapshot = build(hand, seed);
      const fate = snapshot.dice.find((die) => die.defId === FATE_DIE_ID);
      expect(fate?.state).toBe("tray");
      expect(fate?.seat).toBeGreaterThanOrEqual(TABLE_SIZE);
      expect(onTableCount(snapshot)).toBe(TABLE_SIZE);
      expect(seatCount(snapshot.dice)).toBe(TABLE_SIZE + 1);
    }
  });
});

describe("the turn cycle", () => {
  it("re-rolls a small hand in place with the same stream draws as before", () => {
    const snapshot = build(SMALL_HAND, 21);
    const streams = createStreams(21);
    const before = serializeStreams(streams);
    const next = advanceTurn(snapshot, streams);
    const replay = restoreStreams(before);
    const expected = SMALL_HAND.map((defId) =>
      rollBaseValue(defId, DIE_BY_ID.get(defId)?.tier ?? 6, replay.dice),
    );
    expect(next.dice.map((die) => die.state)).toEqual(SMALL_HAND.map(() => "tray"));
    expect(next.dice.map((die) => die.seat)).toEqual(SMALL_HAND.map((_, index) => index));
    expect(next.dice.map((die) => die.value)).toEqual(expected);
    expect(serializeStreams(streams).dice).toBe(serializeStreams(replay).dice);
  });

  it("sends the table to the discard and draws seven fresh dice", () => {
    let snapshot = build(BIG_HAND, 8);
    const streams = createStreams(8);
    const seen = new Set<string>();
    for (let turn = 0; turn < 6; turn += 1) {
      expect(onTableCount(snapshot)).toBe(TABLE_SIZE);
      for (const die of tableDice(snapshot.dice)) seen.add(die.uid);
      snapshot = advanceTurn(snapshot, streams);
    }
    expect(seen.size).toBe(BIG_HAND.length);
  });

  it("reshuffles the discard when the bag runs dry mid-draw", () => {
    const dice: RolledDie[] = Array.from({ length: 9 }, (_, i) => ({
      uid: `die-${String(i)}`,
      defId: "red-d6",
      tier: 6,
      school: "red",
      value: 3,
      state: i < 2 ? "bag" : "discard",
    }));
    const result = drawFromBag(dice, 7, () => createStream(77));
    expect(result.reshuffled).toBe(true);
    expect(result.drawn.size).toBe(7);
    expect(result.drawn.has("die-0")).toBe(true);
    expect(result.drawn.has("die-1")).toBe(true);
    expect(result.dice.filter((die) => die.state === "bag")).toHaveLength(2);
    expect(result.dice.filter((die) => die.state === "discard")).toHaveLength(0);
  });

  it("keeps a reserved die, its value and its seat, and fills the other six", () => {
    const snapshot = build(BIG_HAND, 13);
    const keeper = tableDice(snapshot.dice)[2];
    if (keeper === undefined) throw new Error("no die on the table");
    const reserved: BattleSnapshot = {
      ...snapshot,
      dice: snapshot.dice.map((die) =>
        die.uid === keeper.uid ? { ...die, state: "reserved" } : die,
      ),
    };
    const next = advanceTurn(reserved, createStreams(13));
    const after = next.dice.find((die) => die.uid === keeper.uid);
    expect(after?.state).toBe("tray");
    expect(after?.value).toBe(keeper.value);
    expect(after?.seat).toBe(keeper.seat);
    expect(onTableCount(next)).toBe(TABLE_SIZE);
  });

  it("keeps a locked die on its seat and draws around it", () => {
    const snapshot = build(BIG_HAND, 17);
    const target = tableDice(snapshot.dice)[4];
    if (target === undefined) throw new Error("no die on the table");
    const locked: BattleSnapshot = {
      ...snapshot,
      lockedDice: [{ uid: target.uid, untilTurn: snapshot.turn + 1 }],
    };
    const next = advanceTurn(locked, createStreams(17));
    const after = next.dice.find((die) => die.uid === target.uid);
    expect(after?.state).toBe("locked");
    expect(after?.value).toBe(target.value);
    expect(after?.seat).toBe(target.seat);
    expect(onTableCount(next)).toBe(TABLE_SIZE);
  });

  it("keeps a banked die on its seat and starts it on the banked face", () => {
    const plain = new Set(["red-d6", "blue-d6", "green-d4", "grey-d4"]);
    for (const seed of [1, 3, 8]) {
      const snapshot = build(BIG_HAND, seed);
      const keeper = tableDice(snapshot.dice).find((die) => plain.has(die.defId));
      if (keeper === undefined) throw new Error("no plain die on the table");
      const banked: BattleSnapshot = {
        ...snapshot,
        dice: snapshot.dice.map((die) =>
          die.uid === keeper.uid
            ? { ...die, bankedValue: keeper.tier, activeUsed: true }
            : die,
        ),
      };
      const next = advanceTurn(banked, createStreams(seed));
      const after = next.dice.find((die) => die.uid === keeper.uid);
      expect(after?.state).toBe("tray");
      expect(after?.seat).toBe(keeper.seat);
      expect(after?.value).toBe(keeper.tier);
      expect(after?.bankedValue).toBeUndefined();
      expect(after?.activeUsed).toBe(false);
      expect(onTableCount(next)).toBe(TABLE_SIZE);
      expect(next.dice.filter((die) => die.state === "bag")).toHaveLength(2);
    }
  });

  it("rolls a die's value when it is drawn, never while it waits", () => {
    const snapshot = build(BIG_HAND, 19);
    const waiting = snapshot.dice.filter((die) => die.state === "bag");
    expect(waiting.every((die) => die.value === 0)).toBe(true);
    const next = advanceTurn(snapshot, createStreams(19));
    for (const die of tableDice(next.dice)) expect(die.value).toBeGreaterThan(0);
  });
});

describe("dice off the table", () => {
  const midasHand = (onTable: boolean): BattleSnapshot => {
    const snapshot = build(["midas", "red-d6", "red-d6"], 31);
    return {
      ...snapshot,
      dice: snapshot.dice.map((die) =>
        die.defId === "midas" && !onTable
          ? { ...die, state: "bag", seat: undefined }
          : die,
      ),
    };
  };

  it("fire their turn hooks only from the table", () => {
    const scrapAfterTurnEnd = (snapshot: BattleSnapshot): number => {
      const ctx = new BattleCtx(snapshot, snapshot.flags);
      emit(buildSources(snapshot), "turnEnd", ctx);
      return snapshot.scrap;
    };
    expect(scrapAfterTurnEnd(midasHand(true))).toBeGreaterThan(0);
    expect(scrapAfterTurnEnd(midasHand(false))).toBe(0);
  });

  it("still count as loadout for the battle-start hook", () => {
    const snapshot = midasHand(false);
    const fired: string[] = [];
    const ctx = new BattleCtx(snapshot, snapshot.flags);
    const probe = buildSources(snapshot).filter((source) => source.dieUid !== undefined);
    const original = probe.map((source) => source.run);
    probe.forEach((source, index) => {
      source.run = (hook, c, die) => {
        fired.push(`${hook}:${String(source.dieUid)}`);
        original[index]?.(hook, c, die);
      };
    });
    emit(probe, "battleStart", ctx);
    emit(probe, "rollStart", ctx);
    const midas = snapshot.dice.find((die) => die.defId === "midas")?.uid;
    expect(fired).toContain(`battleStart:${String(midas)}`);
    expect(fired).not.toContain(`rollStart:${String(midas)}`);
  });
});

describe("seats", () => {
  it("seats a legacy table with no seat numbers in array order", () => {
    const legacy: RolledDie[] = ["a", "b", "c"].map((uid) => ({
      uid,
      defId: "red-d6",
      tier: 6,
      school: "red",
      value: 2,
      state: "tray",
    }));
    expect(assignSeats(legacy).map((die) => die.seat)).toEqual([0, 1, 2]);
  });

  it("reads a copy's neighbours by seat, not by position in the hand", () => {
    const dice: RolledDie[] = [
      { uid: "x", defId: "grey-d4", tier: 4, school: "grey", value: 1, state: "tray", seat: 0 },
      { uid: "far", defId: "red-d6", tier: 6, school: "red", value: 6, state: "bag" },
      { uid: "y", defId: "red-d6", tier: 6, school: "red", value: 5, state: "tray", seat: 1 },
    ];
    expect(bySeat(dice).map((die) => die.uid)).toEqual(["x", "y"]);
    expect(adjacentCopyValue(dice, "x")).toBe(5);
  });

  const seated = (uid: string, value: number, seat: number): RolledDie => ({
    uid,
    defId: "red-d6",
    tier: 6,
    school: "red",
    value,
    state: "tray",
    seat,
  });

  const fateAt = (seat: number, value: number): RolledDie => ({
    uid: "fate",
    defId: FATE_DIE_ID,
    tier: 100,
    school: "grey",
    value,
    state: "tray",
    seat,
  });

  it("never copies the Fate die's face onto the last seat of a full table", () => {
    const dice = [
      ...Array.from({ length: TABLE_SIZE }, (_, seat) =>
        seated(`die-${String(seat)}`, seat === TABLE_SIZE - 2 ? 4 : 2, seat),
      ),
      fateAt(TABLE_SIZE, 90),
    ];
    expect(adjacentCopyValue(dice, `die-${String(TABLE_SIZE - 1)}`)).toBe(4);
  });

  it("reads neighbours by seat number and does not jump the empty seats", () => {
    const dealt = dealHand(
      ["red-d6", "blue-d6", "green-d4", "red-d6", "grey-d4", FATE_DIE_ID],
      createStreams(5),
    );
    const seats = tableSeats(dealt);
    expect(seats.get("die-4")).toBe(4);
    expect(seats.get("die-5")).toBeGreaterThanOrEqual(TABLE_SIZE);
    const left = dealt.find((die) => seats.get(die.uid) === 3);
    expect(adjacentCopyValue(dealt, "die-4")).toBe(left?.value);
    const lonely = [seated("a", 3, 0), seated("b", 6, 2)];
    expect(adjacentCopyValue(lonely, "a")).toBeUndefined();
  });

  it("never offers the Fate die as a swap partner", () => {
    const mimic = seated("mimic", 2, 0);
    expect(isSwapTarget(mimic, fateAt(TABLE_SIZE, 90))).toBe(false);
    expect(isSwapTarget(mimic, seated("other", 5, 1))).toBe(true);
  });
});

describe("forged custom faces in the engine", () => {
  const forged = (defId: string): RolledDie => {
    const [dealt] = dealHand(
      [{ defId, fusion: { level: 1, consumed: ["x"] } }],
      createStreams(1),
    );
    if (dealt === undefined) throw new Error(defId);
    return dealt;
  };

  it("reads the top and bottom face from the forged die itself", () => {
    const chip = forged("prismChip");
    expect(chip.faces).toEqual([2, 3, 3, 4, 5, 5]);
    expect(dieFaceMax(chip)).toBe(5);
    expect(dieFaceMin(chip)).toBe(2);
  });

  it("counts only the forged top face as the max face", () => {
    const payout = (value: number): number => {
      const die = { ...forged("prismChip"), value };
      const snapshot = harnessSnap([die]);
      const ctx = new BattleCtx(snapshot, []);
      applyDefs(
        [{ on: "rolled", if: [{ c: "isMaxFace" }], do: [{ a: "scrap", n: 1 }] }],
        "rolled",
        ctx,
        die,
      );
      return snapshot.scrap;
    };
    expect(payout(4)).toBe(0);
    expect(payout(5)).toBe(1);
  });

  it("sets a die to its forged max", () => {
    const die = { ...forged("prismChip"), value: 2 };
    const snapshot = harnessSnap([die]);
    applyActions(
      [{ a: "setDieValue", max: true, sel: { s: "lowestDie" } }],
      new BattleCtx(snapshot, []),
    );
    expect(snapshot.dice[0]?.value).toBe(5);
  });

  it("lets Obsidian Pact land a forged black die on its new top face", () => {
    const pact = (value: number): number => {
      const die = { ...forged("cinderblack"), value };
      applyObsidianPact([die], ["obsidianCreed"], []);
      return die.value;
    };
    expect(pact(5)).toBe(5);
    expect(pact(4)).toBe(5);
    expect(pact(1)).toBe(1);
  });

  it("rerolls a forged die across its forged faces", () => {
    const seen = new Set<number>();
    for (let turn = 1; turn <= 60; turn += 1) {
      const die = { ...forged("glimmer"), value: 1 };
      const snapshot = harnessSnap([die], { turn });
      new BattleCtx(snapshot, []).rerollDie(die);
      seen.add(die.value);
    }
    expect(seen.has(5)).toBe(true);
    expect([...seen].every((value) => [1, 4, 5].includes(value))).toBe(true);
  });
});
