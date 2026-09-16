import { beforeEach, describe, expect, it } from "vitest";
import { STARTER_DECK } from "@/data/decks";
import { OFFICER_BY_ID, officerToken } from "@/data/officers";
import { cabinAction, consoleShape } from "@/game/battle/view";
import { sourceMods } from "@/game/run/runMods";
import { VULNERABLE_CAP } from "@/game/battle/resolver";
import { createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  useBattleStore,
  type BattleEncounter,
} from "@/stores/battleStore";
import type { EnemyState } from "@/types/battle";

const start = (extra: Partial<BattleEncounter> = {}): void => {
  useBattleStore.getState().startBattle(
    {
      enemyIds: ["raider"],
      hull: 10,
      hullMax: 20,
      chargeCap: 10,
      startCharge: 4,
      ...extra,
    },
    STARTER_DECK,
    createStreams(42),
  );
};

const use = (officerId: string): void => {
  useBattleStore.getState().useOfficerActive(officerId);
};

const target = (): EnemyState | undefined => {
  const s = useBattleStore.getState();
  return s.enemies.find((e) => e.id === s.targetId);
};

const setTargetMark = (n: number): void => {
  const s = useBattleStore.getState();
  useBattleStore.setState({
    enemies: s.enemies.map((enemy) =>
      enemy.id === s.targetId
        ? { ...enemy, statuses: { ...enemy.statuses, mark: n } }
        : enemy,
    ),
  });
};

beforeEach(() => {
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.setState(createInitialBattleValues());
});

describe("officer actives resolve to their own arithmetic", () => {
  it("patches one hull for one charge", () => {
    start({ officers: ["scrapper"] });
    const before = useBattleStore.getState();
    use("scrapper");
    const after = useBattleStore.getState();
    expect(after.hull).toBe(before.hull + 1);
    expect(after.charge).toBe(before.charge - 1);
  });

  it("raises the shield by one without touching charge", () => {
    start({ officers: ["welder"] });
    const before = useBattleStore.getState();
    use("welder");
    const after = useBattleStore.getState();
    expect(after.shield).toBe(before.shield + 1);
    expect(after.charge).toBe(before.charge);
  });

  it("cranks four charge into the reactor", () => {
    start({ officers: ["breaker"], startCharge: 2 });
    use("breaker");
    expect(useBattleStore.getState().charge).toBe(6);
  });

  it("marks the current target for four", () => {
    start({ officers: ["defector"] });
    expect(target()?.statuses.mark).toBeUndefined();
    use("defector");
    expect(target()?.statuses.mark).toBe(VULNERABLE_CAP);
  });

  it("jams the current target", () => {
    start({ officers: ["chorister"] });
    expect(target()?.statuses.jam).toBeUndefined();
    use("chorister");
    expect(target()?.statuses.jam).toBe(1);
  });

  it("hands the mechanic's reroll straight to the counter", () => {
    start({ officers: ["mechanic"] });
    const before = useBattleStore.getState().rerollsLeft;
    use("mechanic");
    expect(useBattleStore.getState().rerollsLeft).toBe(before + 1);
  });
});

describe("officer passives reach the battle the run starts", () => {
  it("widens the reroll from the chorister's cabin", () => {
    start();
    const base = useBattleStore.getState().rerollSize;
    start({ officers: ["chorister"] });
    expect(useBattleStore.getState().rerollSize).toBe(base + 1);
    expect(useBattleStore.getState().rerollBase).toBe(base + 1);
  });

  it("carries the aboard roster onto the battle snapshot the resolver reads", () => {
    start({ officers: ["defector", "welder"] });
    expect(useBattleStore.getState().officers).toEqual(["defector", "welder"]);
    expect(sourceMods(useBattleStore.getState()).markBonusDelta).toBe(1);
    expect(sourceMods(useBattleStore.getState()).evasionDelta).toBe(3);
  });
});

describe("the reactor clamp", () => {
  it("never carries charge past the cap", () => {
    start({ officers: ["breaker"], chargeCap: 10, startCharge: 9 });
    expect(useBattleStore.getState().charge).toBe(9);
    use("breaker");
    const after = useBattleStore.getState();
    expect(after.charge).toBe(10);
    expect(after.charge).toBeLessThanOrEqual(after.chargeCap);
  });

  it("never lets a costed active take charge below zero", () => {
    start({ officers: ["scrapper"], startCharge: 0 });
    const before = useBattleStore.getState();
    expect(before.charge).toBe(0);
    use("scrapper");
    const after = useBattleStore.getState();
    expect(after.charge).toBe(0);
    expect(after.hull).toBe(before.hull);
    expect(after.spentGrants).toEqual([]);
  });
});

describe("one use per battle", () => {
  it("spends the cabin the first time and refuses the second", () => {
    start({ officers: ["welder"] });
    use("welder");
    const once = useBattleStore.getState();
    expect(once.spentGrants).toContain(officerToken("welder"));
    use("welder");
    const twice = useBattleStore.getState();
    expect(twice.shield).toBe(once.shield);
    expect(
      twice.spentGrants.filter((token) => token === officerToken("welder")),
    ).toHaveLength(1);
  });

  it("survives the turn boundary and re-arms only at the next battle", () => {
    start({ officers: ["welder"] });
    use("welder");
    useBattleStore.getState().endTurn();
    useBattleStore.getState().finishResolution();
    expect(useBattleStore.getState().spentGrants).toContain(
      officerToken("welder"),
    );
    start({ officers: ["welder"] });
    expect(useBattleStore.getState().spentGrants).toEqual([]);
    use("welder");
    expect(useBattleStore.getState().spentGrants).toContain(
      officerToken("welder"),
    );
  });

  it("refuses an officer who is not in a cabin on this ship", () => {
    start({ officers: ["welder"] });
    const before = useBattleStore.getState().shield;
    use("breaker");
    const after = useBattleStore.getState();
    expect(after.shield).toBe(before);
    expect(after.spentGrants).toEqual([]);
  });
});

describe("the cabin console entries", () => {
  it("renders nothing for an empty cabin", () => {
    start();
    expect(consoleShape(useBattleStore.getState()).cabins).toEqual([
      null,
      null,
    ]);
  });

  it("names one entry per occupied cabin, in boarding order", () => {
    start({ officers: ["mechanic", "welder"] });
    const cabins = consoleShape(useBattleStore.getState()).cabins;
    expect(cabins[0]).toBe(OFFICER_BY_ID.get("mechanic"));
    expect(cabins[1]).toBe(OFFICER_BY_ID.get("welder"));
  });

  it("prices the costed active and blocks it when the reactor is short", () => {
    start({ officers: ["scrapper"], startCharge: 0 });
    const blocked = cabinAction(useBattleStore.getState(), "cabinA");
    expect(blocked.cost).toBe(1);
    expect(blocked.enabled).toBe(false);
    expect(blocked.block).toBe("noCharge");
    start({ officers: ["scrapper"], startCharge: 4 });
    expect(cabinAction(useBattleStore.getState(), "cabinA").enabled).toBe(true);
  });

  it("says spent once the cabin has been used this battle", () => {
    start({ officers: ["welder"] });
    expect(cabinAction(useBattleStore.getState(), "cabinA").enabled).toBe(true);
    use("welder");
    const after = cabinAction(useBattleStore.getState(), "cabinA");
    expect(after.enabled).toBe(false);
    expect(after.block).toBe("spent");
  });

  it("blocks the empty cabin rather than enabling a button with no officer", () => {
    start({ officers: ["welder"] });
    const empty = cabinAction(useBattleStore.getState(), "cabinB");
    expect(empty.enabled).toBe(false);
    expect(empty.block).toBe("notAllowed");
  });

  it("refuses the mark active when the target already carries as deep a mark", () => {
    start({ officers: ["defector"] });
    setTargetMark(VULNERABLE_CAP);
    const dead = cabinAction(useBattleStore.getState(), "cabinA");
    expect(dead.enabled).toBe(false);
    expect(dead.block).toBe("notAllowed");
    setTargetMark(VULNERABLE_CAP - 1);
    expect(cabinAction(useBattleStore.getState(), "cabinA").enabled).toBe(true);
    use("defector");
    expect(target()?.statuses.mark).toBe(VULNERABLE_CAP);
  });

  it("never spends the cabin on a mark the merge would swallow", () => {
    start({ officers: ["defector"] });
    setTargetMark(VULNERABLE_CAP);
    use("defector");
    const after = useBattleStore.getState();
    expect(after.spentGrants).toEqual([]);
    expect(target()?.statuses.mark).toBe(VULNERABLE_CAP);
  });
});

describe("the designate gate reads the aimed enemy, not the first living one", () => {
  it("marks a subsystem's parent while the first enemy is already saturated", () => {
    start({ enemyIds: ["raider", "raiderAlpha"], officers: ["defector"] });
    const seated = useBattleStore.getState();
    const parent = seated.enemies[1];
    if (parent === undefined) throw new Error("the elite did not spawn");
    const part = parent.subsystems[0];
    if (part === undefined) throw new Error("the elite has no subsystem");
    useBattleStore.setState({
      enemies: seated.enemies.map((enemy, index) =>
        index === 0
          ? { ...enemy, statuses: { ...enemy.statuses, mark: VULNERABLE_CAP } }
          : enemy,
      ),
    });
    useBattleStore.getState().setTarget(part.id);
    expect(useBattleStore.getState().targetId).toBe(part.id);

    use("defector");

    const after = useBattleStore.getState();
    expect(after.enemies[1]?.statuses.mark).toBe(VULNERABLE_CAP);
    expect(after.spentGrants).toContain(officerToken("defector"));
  });

  it("still refuses when the subsystem's own parent is saturated", () => {
    start({ enemyIds: ["raider", "raiderAlpha"], officers: ["defector"] });
    const seated = useBattleStore.getState();
    const parent = seated.enemies[1];
    if (parent === undefined) throw new Error("the elite did not spawn");
    const part = parent.subsystems[0];
    if (part === undefined) throw new Error("the elite has no subsystem");
    useBattleStore.setState({
      enemies: seated.enemies.map((enemy, index) =>
        index === 1
          ? { ...enemy, statuses: { ...enemy.statuses, mark: VULNERABLE_CAP } }
          : enemy,
      ),
    });
    useBattleStore.getState().setTarget(part.id);

    use("defector");

    expect(useBattleStore.getState().spentGrants).not.toContain(
      officerToken("defector"),
    );
  });
});
