import { describe, expect, it } from "vitest";
import {
  harnessDie,
  harnessEnemy,
  harnessSnap,
  place,
} from "@/game/battle/battleHarness";
import { canCopy } from "@/game/battle/actives";
import {
  computeCensus,
  resonanceAtLeast,
} from "@/game/battle/resonance";
import {
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import { applyRollFloors } from "@/game/battle/rollFloors";
import { BattleCtx } from "@/game/effects/context";
import { buildSources, emit } from "@/game/effects/pipeline";
import { createStream } from "@/services/rng";
import { grantsFromCensus } from "@/stores/battleStore";
import type { RolledDie } from "@/types/battle";

const filler = (defId: string, n: number): RolledDie[] =>
  Array.from({ length: n }, (_, i) => harnessDie(`${defId}-${String(i)}`, defId));

const weaponBeats = (dice: RolledDie[], placeUid: string, slot: "weaponA") => {
  const snap = harnessSnap(dice);
  place(snap, placeUid, slot);
  return resolvePlayerPhase(snap);
};

describe("census", () => {
  it("counts dice by school", () => {
    const census = computeCensus(filler("ember", 3));
    expect(census.counts.red).toBe(3);
  });

  it("prismatic counts toward the highest set", () => {
    const dice = [...filler("ember", 2), harnessDie("p", "coreshard")];
    const census = computeCensus(dice);
    expect(census.counts.red).toBe(3);
    expect(census.counts.prismatic).toBe(1);
  });

  it("prismatic ties break to the earlier school in fixed order", () => {
    const dice = [
      harnessDie("r", "ember"),
      harnessDie("b", "frostplate"),
      harnessDie("p", "coreshard"),
    ];
    const census = computeCensus(dice);
    expect(census.counts.red).toBe(2);
    expect(census.counts.blue).toBe(1);
  });
});

describe("red resonance", () => {
  it("red-2: red dice in Weapons deal +1", () => {
    const dice = [harnessDie("w", "ember", 4), harnessDie("f", "ember", 6)];
    const { beats } = weaponBeats(dice, "w", "weaponA");
    expect(beats.find((b) => b.kind === "damage")?.amount).toBe(7);
  });

  it("red-4: a max-face weapon roll applies Burn 2", () => {
    const dice = [harnessDie("w", "ember", 6), ...filler("ember", 3)];
    const { next } = weaponBeats(dice, "w", "weaponA");
    expect(next.enemies[0]?.statuses.burn).toBe(2);
  });

  it("red-6: the first Weapons slot resolves twice", () => {
    const dice = [harnessDie("w", "ember", 5), ...filler("ember", 5)];
    const { beats } = weaponBeats(dice, "w", "weaponA");
    const damage = beats.filter(
      (b) => b.slot === "weaponA" && b.kind === "damage",
    );
    expect(damage).toHaveLength(2);
  });
});

describe("blue resonance", () => {
  it("blue-2: +1 to every blue die's minimum roll", () => {
    const census = computeCensus(filler("frostplate", 2));
    const d = harnessDie("x", "frostplate", 1);
    applyRollFloors([d], census);
    expect(d.value).toBe(2);
  });

  it("blue-4: blue shields persist through the enemy turn reset", () => {
    const snap = harnessSnap(filler("frostplate", 4), {
      enemies: [harnessEnemy({ nextIntent: { t: "charge" } })],
    });
    const first = snap.dice[0];
    if (first === undefined) throw new Error("no die");
    first.value = 5;
    place(snap, first.uid, "shields");
    const player = resolvePlayerPhase(snap);
    expect(player.next.shield).toBe(7);
    expect(player.next.shieldPersist).toBe(7);
    const enemy = resolveEnemyPhase(player.next, createStream(1));
    expect(enemy.next.shield).toBe(7);
  });

  it("without the 4-set, shields still reset to 0", () => {
    const snap = harnessSnap(filler("frostplate", 2), {
      enemies: [harnessEnemy({ nextIntent: { t: "charge" } })],
    });
    const first = snap.dice[0];
    if (first === undefined) throw new Error("no die");
    first.value = 5;
    place(snap, first.uid, "shields");
    const player = resolvePlayerPhase(snap);
    const enemy = resolveEnemyPhase(player.next, createStream(1));
    expect(enemy.next.shield).toBe(0);
  });

  it("blue-6: one blue die is floored to its average", () => {
    const dice = filler("frostplate", 6).map((d) => ({ ...d, value: 1 }));
    const census = computeCensus(dice);
    applyRollFloors(dice, census);
    expect(dice.filter((d) => d.value === 4)).toHaveLength(1);
    expect(dice.filter((d) => d.value === 2)).toHaveLength(5);
  });
});

describe("green resonance", () => {
  it("green-2: repeating last turn's value grants +2", () => {
    const die = harnessDie("t", "green-d4", 3);
    die.lastValue = 3;
    const snap = harnessSnap([die, harnessDie("f", "green-d4", 2)]);
    const ctx = new BattleCtx(snap);
    const sources = buildSources(snap);
    ctx.subjectDie = die;
    emit(sources, "rolled", ctx);
    expect(die.value).toBe(5);
  });

  it("green-4: end of battle heals 1 per green die", () => {
    const dice = [harnessDie("w", "green-d4", 4), ...filler("green-d4", 3)];
    const snap = harnessSnap(dice, {
      hull: 20,
      enemies: [harnessEnemy({ hp: 4, hpMax: 40 })],
    });
    place(snap, "w", "weaponA");
    const { next } = resolvePlayerPhase(snap);
    expect(next.outcome).toBe("victory");
    expect(next.hull).toBe(24);
  });

  it("green-6: a green die on max grows +1 for the run", () => {
    const dice = [harnessDie("g", "green-d4", 4), ...filler("green-d4", 5)];
    const snap = harnessSnap(dice);
    place(snap, "g", "sensors");
    const { next } = resolvePlayerPhase(snap);
    expect(next.dice.find((d) => d.uid === "g")?.growth).toBe(1);
  });
});

describe("yellow resonance", () => {
  it("yellow-2: a max-face roll grants +4 scrap", () => {
    const dice = [harnessDie("y", "yellow-d6", 6), harnessDie("f", "yellow-d6", 2)];
    const snap = harnessSnap(dice);
    place(snap, "y", "sensors");
    expect(resolvePlayerPhase(snap).next.scrap).toBe(4);
  });

  it("yellow-4: a max-face weapon roll crits ×1.5", () => {
    const dice = [harnessDie("y", "yellow-d6", 6), ...filler("yellow-d6", 3)];
    const { beats } = weaponBeats(dice, "y", "weaponA");
    expect(beats.find((b) => b.kind === "damage")?.amount).toBe(9);
  });

  it("yellow-6: grants +1 reroll die", () => {
    expect(grantsFromCensus(computeCensus(filler("yellow-d6", 6))).rerollBase).toBe(
      3,
    );
  });
});

describe("black resonance", () => {
  it("black-2: a black die may exceed a slot cap at −1 hull", () => {
    const dice = [harnessDie("o", "obsidian", 8), harnessDie("f", "black-d6", 3)];
    const snap = harnessSnap(dice);
    expect(
      resonanceAtLeast(snap.resonance, "black", 2),
    ).toBe(true);
    place(snap, "o", "engines");
    const { next } = resolvePlayerPhase(snap);
    expect(next.hull).toBe(29);
    expect(next.engineState).toBe("dodgePlus");
  });

  it("black-4: a min-face black roll maxes the next black die", () => {
    const dice = [
      harnessDie("s", "black-d6", 1),
      harnessDie("r", "black-d6", 3),
      ...filler("black-d6", 2),
    ];
    const snap = harnessSnap(dice);
    place(snap, "s", "sensors");
    place(snap, "r", "reactor");
    expect(resolvePlayerPhase(snap).next.charge).toBe(9);
  });

  it("black-6: survive a lethal hit once at 1 hull", () => {
    const snap = harnessSnap(filler("black-d6", 6), {
      hull: 3,
      enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 5 } })],
    });
    const { next } = resolveEnemyPhase(snap, createStream(1));
    expect(next.hull).toBe(1);
    expect(next.survivedLethal).toBe(true);
    expect(next.outcome).toBeUndefined();
  });
});

describe("grey and prismatic resonance", () => {
  it("grey-2: reroll capacity rises to 3", () => {
    expect(grantsFromCensus(computeCensus(filler("grey-d4", 3))).rerollBase).toBe(3);
  });

  it("grey-4: grey dice may copy an adjacent value", () => {
    const die = harnessDie("g", "grey-d4");
    expect(canCopy(die, computeCensus(filler("grey-d4", 4)))).toBe(true);
    expect(canCopy(die, computeCensus(filler("grey-d4", 1)))).toBe(false);
  });

  it("grey-6: reserve capacity +1", () => {
    expect(grantsFromCensus(computeCensus(filler("grey-d4", 6))).reserveCap).toBe(2);
  });

  it("prismatic-2: +1 free nudge per battle", () => {
    expect(
      grantsFromCensus(computeCensus(filler("coreshard", 2))).freeNudges,
    ).toBe(1);
  });
});
