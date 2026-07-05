import { beforeEach, describe, expect, it } from "vitest";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { adjacentCopyValue, flippedValue } from "@/game/battle/actives";
import { harnessDie, harnessSnap, place } from "@/game/battle/battleHarness";
import { resolvePlayerPhase } from "@/game/battle/resolver";
import { BattleCtx } from "@/game/effects/context";
import { buildSources, emit } from "@/game/effects/pipeline";
import { createStream, createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  useBattleStore,
} from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";

const weaponDamage = (defId: string, value: number): number => {
  const die = harnessDie("w", defId, value);
  const snap = harnessSnap([die]);
  place(snap, "w", "weaponA");
  return (
    resolvePlayerPhase(snap).beats.find((b) => b.kind === "damage")?.amount ?? 0
  );
};

describe("plain dice", () => {
  it("carry no effects, faces, growth or active fields", () => {
    for (const id of ["ember", "frostplate", "ballast"]) {
      const def = DIE_BY_ID.get(id);
      expect(def?.effects).toBeUndefined();
      expect(def?.faces).toBeUndefined();
      expect(def?.growth).toBeUndefined();
      expect(def?.active).toBeUndefined();
    }
  });

  it("coreshard is a prismatic legendary d10", () => {
    const def = DIE_BY_ID.get("coreshard");
    expect(def?.school).toBe("prismatic");
    expect(def?.tier).toBe(10);
    expect(def?.rarity).toBe("legendary");
  });
});

describe("cinder", () => {
  it("sets Burn 1 on a max-face weapon roll", () => {
    const die = harnessDie("c", "cinder", 4);
    const snap = harnessSnap([die]);
    place(snap, "c", "weaponA");
    expect(resolvePlayerPhase(snap).next.enemies[0]?.statuses.burn).toBe(1);
  });

  it("does nothing below max face", () => {
    const die = harnessDie("c", "cinder", 3);
    const snap = harnessSnap([die]);
    place(snap, "c", "weaponA");
    expect(
      resolvePlayerPhase(snap).next.enemies[0]?.statuses.burn,
    ).toBeUndefined();
  });
});

describe("slug and bulwark", () => {
  it("slug deals +1 in Weapons over a plain die", () => {
    expect(weaponDamage("slug", 4)).toBe(7);
    expect(weaponDamage("ember", 4)).toBe(6);
  });

  it("bulwark grants +1 shield in Shields", () => {
    const die = harnessDie("b", "bulwark", 4);
    const snap = harnessSnap([die]);
    place(snap, "b", "shields");
    expect(resolvePlayerPhase(snap).next.shield).toBe(7);
  });
});

describe("coil", () => {
  it("adds +1 when it matches last turn's value", () => {
    const die = harnessDie("c", "coil", 3);
    die.lastValue = 3;
    const snap = harnessSnap([die]);
    const ctx = new BattleCtx(snap);
    const sources = buildSources(snap);
    ctx.subjectDie = die;
    emit(sources, "rolled", ctx);
    expect(die.value).toBe(4);
  });
});

describe("sprout", () => {
  it("grows +1 on a max roll, capped at +2", () => {
    let die = harnessDie("s", "sprout", 6);
    for (let i = 0; i < 3; i += 1) {
      const snap = harnessSnap([die]);
      place(snap, "s", "sensors");
      const next = resolvePlayerPhase(snap).next.dice.find(
        (d) => d.uid === "s",
      );
      if (next === undefined) throw new Error("lost die");
      die = { ...next, value: 6 + (next.growth ?? 0) };
    }
    expect(die.growth).toBe(2);
  });
});

describe("lucky-chip and vulture", () => {
  it("lucky-chip grants +2 scrap on max", () => {
    const die = harnessDie("l", "lucky-chip", 4);
    const snap = harnessSnap([die]);
    place(snap, "l", "sensors");
    expect(resolvePlayerPhase(snap).next.scrap).toBe(2);
  });

  it("vulture grants +8 scrap on max", () => {
    const die = harnessDie("v", "vulture", 8);
    const snap = harnessSnap([die]);
    place(snap, "v", "sensors");
    expect(resolvePlayerPhase(snap).next.scrap).toBe(8);
  });
});

describe("ashen", () => {
  it("boosts the next black die by +2 on a min roll", () => {
    const dice = [harnessDie("a", "ashen", 1), harnessDie("r", "black-d6", 3)];
    const snap = harnessSnap(dice);
    place(snap, "a", "sensors");
    place(snap, "r", "reactor");
    expect(resolvePlayerPhase(snap).next.charge).toBe(7);
  });
});

describe("obsidian", () => {
  it("rolls only 1 or 8", () => {
    const stream = createStream(123);
    for (let i = 0; i < 40; i += 1) {
      expect([1, 8]).toContain(rollBaseValue("obsidian", 8, stream));
    }
  });
});

describe("gyro (flip) and copycat (copy) actives", () => {
  beforeEach(() => {
    useBattleStore.setState(useBattleStore.getInitialState(), true);
    useBattleStore.setState(createInitialBattleValues());
    useRunStore.setState({ mkLevels: {} });
  });

  it("flip inverts the face once per battle", () => {
    expect(flippedValue(harnessDie("g", "gyro", 2))).toBe(5);
    useBattleStore
      .getState()
      .startBattle({ enemyIds: ["raider"] }, ["gyro"], createStreams(1));
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => (d.uid === uid ? { ...d, value: 2 } : d)),
    }));
    useBattleStore.getState().flipDie(uid);
    expect(useBattleStore.getState().dice[0]?.value).toBe(5);
    expect(useBattleStore.getState().dice[0]?.activeUsed).toBe(true);
    useBattleStore.getState().flipDie(uid);
    expect(useBattleStore.getState().dice[0]?.value).toBe(5);
  });

  it("copy takes an adjacent tray die's value", () => {
    const dice = [harnessDie("c", "copycat", 2), harnessDie("n", "ember", 5)];
    expect(adjacentCopyValue(dice, "c")).toBe(5);
    useBattleStore
      .getState()
      .startBattle(
        { enemyIds: ["raider"] },
        ["copycat", "ember"],
        createStreams(1),
      );
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d, i) =>
        i === 0 ? { ...d, value: 2 } : i === 1 ? { ...d, value: 5 } : d,
      ),
    }));
    const uid = useBattleStore.getState().dice[0]?.uid ?? "";
    useBattleStore.getState().copyDie(uid);
    expect(useBattleStore.getState().dice[0]?.value).toBe(5);
    expect(useBattleStore.getState().dice[0]?.activeUsed).toBe(true);
  });
});
