import { beforeEach, describe, expect, it } from "vitest";
import { harnessDie, harnessEnemy, harnessSnap, place } from "@/game/battle/battleHarness";
import { resolveEnemyPhase, resolvePlayerPhase } from "@/game/battle/resolver";
import { applyRollFloors, applySpareLowest } from "@/game/battle/rollFloors";
import { BattleCtx, buildSources, emit } from "@/game/effects";
import { computeCensus } from "@/game/battle/resonance";
import { computePerkMods, hasTrait, perkChargeCap } from "@/game/run/perkMods";
import { rollPerkChoices } from "@/game/run/perkDraft";
import { createStream } from "@/services/rng";
import { useBattleStore } from "@/stores/battleStore";
import type { BattleSnapshot, RolledDie, SlotId } from "@/types/battle";

const build = (
  perks: string[],
  dice: RolledDie[],
  placements: Partial<Record<SlotId, string>> = {},
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot => {
  const snap = harnessSnap(dice, { perks, ...over });
  for (const [slotId, uid] of Object.entries(placements) as [SlotId, string][]) {
    place(snap, uid, slotId);
  }
  return snap;
};

const enemyHp = (snap: BattleSnapshot, id = "enemy-0"): number =>
  snap.enemies.find((e) => e.id === id)?.hp ?? -1;

const MOD_PERKS: [string, keyof ReturnType<typeof computePerkMods>, number][] = [
  ["blue-reserve", "blueReserveDelta", 1],
  ["overgrowth", "growthCapDelta", 1],
  ["regen", "battleEndHeal", 2],
  ["prospector", "scrapMultPct", 25],
  ["haggler", "shopDiscountPct", 15],
  ["coin", "battleStartScrap", 3],
  ["grip", "rerollSizeDelta", 1],
  ["reservist", "reserveDelta", 1],
  ["calibration", "nudgeCostDelta", -1],
  ["afterburner", "enginesThresholdDelta", 1],
  ["jammer-plus", "jamPowerDelta", 1],
  ["condenser", "chargeCapDelta", 2],
  ["targeter", "markBonusDelta", 1],
  ["plating", "hullMaxDelta", 5],
];

describe("perk mods", () => {
  it("each numeric perk contributes its declared modifier", () => {
    for (const [id, key, value] of MOD_PERKS) {
      expect(computePerkMods([id])[key]).toBe(value);
    }
  });

  it("condenser lifts the reactor charge cap to 12", () => {
    expect(perkChargeCap([])).toBe(10);
    expect(perkChargeCap(["condenser"])).toBe(12);
  });
});

describe("perk draft", () => {
  it("offers three distinct, unowned perks", () => {
    const choices = rollPerkChoices(createStream(3), []);
    expect(choices).toHaveLength(3);
    expect(new Set(choices).size).toBe(3);
    const owning = rollPerkChoices(createStream(3), choices);
    for (const id of choices) expect(owning).not.toContain(id);
  });
});

describe("effect perks", () => {
  it("hot-charge adds +2 on a max-face weapon roll", () => {
    const base = resolvePlayerPhase(
      build([], [harnessDie("w", "ember", 6)], { weaponA: "w" }),
    );
    const boosted = resolvePlayerPhase(
      build(["hot-charge"], [harnessDie("w", "ember", 6)], { weaponA: "w" }),
    );
    expect(enemyHp(base.next) - enemyHp(boosted.next)).toBe(2);
  });

  it("warmup adds +1 to red dice on turn 1 only", () => {
    const t1 = resolvePlayerPhase(
      build(["warmup"], [harnessDie("w", "ember", 5)], { weaponA: "w" }),
    );
    const t2 = resolvePlayerPhase(
      build(["warmup"], [harnessDie("w", "ember", 5)], { weaponA: "w" }, { turn: 2 }),
    );
    expect(enemyHp(t2.next) - enemyHp(t1.next)).toBe(1);
  });

  it("ice-circuit grants +2 shield at value 6+", () => {
    const base = resolvePlayerPhase(
      build([], [harnessDie("s", "frostplate", 6)], { shields: "s" }),
    );
    const boosted = resolvePlayerPhase(
      build(["ice-circuit"], [harnessDie("s", "frostplate", 6)], { shields: "s" }),
    );
    expect(boosted.next.shield - base.next.shield).toBe(2);
  });

  it("fortune grants scrap on a max roll", () => {
    const res = resolvePlayerPhase(
      build(["fortune"], [harnessDie("w", "ember", 6)], { weaponA: "w" }),
    );
    expect(res.next.scrap).toBe(2);
  });

  it("on-edge adds +1 when hull is below 30%", () => {
    const low = resolvePlayerPhase(
      build(["on-edge"], [harnessDie("w", "ember", 5)], { weaponA: "w" }, { hull: 8 }),
    );
    const high = resolvePlayerPhase(
      build(["on-edge"], [harnessDie("w", "ember", 5)], { weaponA: "w" }, { hull: 30 }),
    );
    expect(enemyHp(high.next) - enemyHp(low.next)).toBe(1);
  });

  it("back-door grants scrap on a min-face black roll", () => {
    const res = resolvePlayerPhase(
      build(["back-door"], [harnessDie("r", "black-d6", 1)], { reactor: "r" }),
    );
    expect(res.next.scrap).toBe(6);
  });

  it("targeter increases mark damage to +3", () => {
    const marked = () =>
      build(["targeter"], [harnessDie("w", "ember", 5)], { weaponA: "w" }, {
        enemies: [harnessEnemy({ statuses: { mark: 1 } })],
      });
    const withT = resolvePlayerPhase(marked());
    const noMarkPlain = resolvePlayerPhase(
      build([], [harnessDie("w", "ember", 5)], { weaponA: "w" }, {
        enemies: [harnessEnemy({ statuses: { mark: 1 } })],
      }),
    );
    expect(enemyHp(noMarkPlain.next) - enemyHp(withT.next)).toBe(1);
  });

  it("echo grants +1 charge on a repeated value", () => {
    const snap = harnessSnap(
      [{ ...harnessDie("d", "green-d4", 3), lastValue: 3 }],
      { perks: ["echo"] },
    );
    const ctx = new BattleCtx(snap);
    const sources = buildSources(snap);
    ctx.subjectDie = snap.dice[0] ?? null;
    emit(sources, "rolled", ctx);
    expect(snap.charge).toBe(1);
  });
});

describe("trait perks", () => {
  it("stabilizer floors the first blue die at 2", () => {
    const dice = [harnessDie("b", "frostplate", 1)];
    applyRollFloors(dice, computeCensus(dice), true);
    expect(dice[0]?.value).toBe(2);
  });

  it("spareLowest bumps the lowest tray die", () => {
    const dice = [harnessDie("a", "ember", 5), harnessDie("b", "grey-d4", 2)];
    applySpareLowest(dice);
    expect(dice[1]?.value).toBe(3);
  });

  it("compost turns burned dice into scrap", () => {
    const res = resolvePlayerPhase(
      build(["compost"], [harnessDie("a", "ember", 4), harnessDie("b", "ember", 4)]),
    );
    expect(res.next.scrap).toBe(2);
  });

  it("burnDouble doubles the first burn only", () => {
    const snap = harnessSnap([], { perks: ["double-fuse"] });
    const ctx = new BattleCtx(snap);
    ctx.addStatus("burn", 2);
    ctx.addStatus("burn", 2);
    expect(snap.enemies[0]?.statuses.burn).toBe(6);
    expect(snap.burnDoubleUsed).toBe(true);
  });

  it("afterburner lowers the engine threshold", () => {
    const base = resolvePlayerPhase(
      build([], [harnessDie("e", "frostplate", 3)], { engines: "e" }),
    );
    const boosted = resolvePlayerPhase(
      build(["afterburner"], [harnessDie("e", "frostplate", 3)], { engines: "e" }),
    );
    expect(base.next.engineState).toBe("brace");
    expect(boosted.next.engineState).toBe("dodge");
  });

  it("ricochet carries overkill to the next enemy", () => {
    const snap = () =>
      build(["ricochet"], [harnessDie("w", "ember", 6)], { weaponA: "w" }, {
        enemies: [
          harnessEnemy({ id: "enemy-0", hp: 3, hpMax: 3 }),
          harnessEnemy({ id: "enemy-1", hp: 40, hpMax: 40 }),
        ],
        targetId: "enemy-0",
      });
    const res = resolvePlayerPhase(snap());
    // ember d6 (6) + red affinity (+2) = 8 damage; 3 kills enemy-0, 5 overkill carries.
    expect(enemyHp(res.next, "enemy-1")).toBe(35);
  });

  it("reflector deals damage back on a dodge", () => {
    const res = resolveEnemyPhase(
      build(["reflector"], [], {}, {
        engineState: "dodge",
        enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 5 }, hp: 20, hpMax: 20 })],
      }),
      createStream(1),
    );
    expect(enemyHp(res.next)).toBe(17);
  });

  it("tug grants charge on a dodge", () => {
    const res = resolveEnemyPhase(
      build(["tug"], [], {}, {
        engineState: "dodge",
        charge: 0,
        enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 5 } })],
      }),
      createStream(1),
    );
    expect(res.next.charge).toBe(1);
  });

  it("jammer-plus deepens the jam penalty", () => {
    const jammed = () =>
      harnessEnemy({ statuses: { jam: 1 }, nextIntent: { t: "attack", n: 10 } });
    const withJ = resolveEnemyPhase(
      build(["jammer-plus"], [], {}, { enemies: [jammed()], hull: 30 }),
      createStream(1),
    );
    const noJ = resolveEnemyPhase(
      build([], [], {}, { enemies: [jammed()], hull: 30 }),
      createStream(1),
    );
    expect(withJ.next.hull - noJ.next.hull).toBe(1);
  });
});

describe("active perk store actions", () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
  });

  it("blood reactor trades 2 hull for 3 charge once per turn", () => {
    useBattleStore.setState({
      phase: "placement",
      perks: ["blood-reactor"],
      hull: 20,
      charge: 0,
      chargeCap: 10,
      bloodReactorUsed: false,
    });
    useBattleStore.getState().bloodReactor();
    expect(useBattleStore.getState().hull).toBe(18);
    expect(useBattleStore.getState().charge).toBe(3);
    useBattleStore.getState().bloodReactor();
    expect(useBattleStore.getState().hull).toBe(18);
    useBattleStore.getState().reset();
  });

  it("sacrifice burns a die into the pool", () => {
    useBattleStore.setState({
      phase: "placement",
      perks: ["sacrifice"],
      dice: [harnessDie("x", "ember", 4)],
      sacrificePool: 0,
    });
    useBattleStore.getState().sacrificeDie("x");
    expect(useBattleStore.getState().sacrificePool).toBe(4);
    expect(useBattleStore.getState().dice[0]?.state).toBe("burned");
    useBattleStore.getState().reset();
  });

  it("blood reactor and sacrifice traits gate the actions", () => {
    expect(hasTrait(["blood-reactor"], "bloodReactor")).toBe(true);
    expect(hasTrait(["sacrifice"], "sacrifice")).toBe(true);
    expect(hasTrait(["grip"], "bloodReactor")).toBe(false);
  });
});
