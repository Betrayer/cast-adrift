import { describe, expect, it } from "vitest";
import { FATE_DIE_ID } from "@/data/fate";
import { harnessBoard } from "@/game/battle/battleHarness";
import { incomingEstimate, shieldsWasted } from "@/game/battle/policy";
import { resolveEnemyPhase } from "@/game/battle/resolver";
import { spawnEnemy } from "@/game/battle/setup";
import { createStream, createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  useBattleStore,
} from "@/stores/battleStore";
import type {
  BattleSnapshot,
  EnemyState,
  SubsystemState,
} from "@/types/battle";

const must = <T>(value: T | undefined, what: string): T => {
  if (value === undefined) throw new Error(what);
  return value;
};

const stream = () => createStream(9);

const spawned = (defId: string): EnemyState =>
  spawnEnemy(defId, "enemy-0", stream(), {});

const boardWith = (
  enemy: EnemyState,
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot =>
  harnessBoard([enemy], [], { hull: 200, hullMax: 200, ...over });

const coreOf = (snapshot: BattleSnapshot): EnemyState =>
  must(snapshot.enemies[0], "the board lost its enemy");

const partOf = (enemy: EnemyState, key: string): SubsystemState =>
  must(
    enemy.subsystems.find((s) => s.key === key),
    `no part "${key}" on "${enemy.defId}"`,
  );

describe("a body phase change rewinds its parts", () => {
  it("puts beaconTrap's lensB back on step 0 when the core seals into phase 1", () => {
    const opened = resolveEnemyPhase(
      boardWith(spawned("beaconTrap")),
      stream(),
    ).next;
    const armed = partOf(coreOf(opened), "lensB");
    expect(armed.intentIndex).toBe(1);
    expect(armed.nextIntent).toEqual({ t: "siphonShield", n: 5 });

    const wounded = structuredClone(opened);
    const core = coreOf(wounded);
    core.hp = Math.floor(core.hpMax * 0.4);
    const { next, beats } = resolveEnemyPhase(wounded, stream());

    const switched = beats.find((b) => b.kind === "phase");
    expect(switched?.amount).toBe(1);
    const atSwitch = partOf(coreOf(must(switched, "no phase beat").after), "lensB");
    expect(atSwitch.intentIndex).toBe(0);
    expect(atSwitch.nextIntent).toEqual({ t: "idle" });

    const afterTurn = partOf(coreOf(next), "lensB");
    expect(afterTurn.intentIndex).toBe(1);
    expect(afterTurn.nextIntent).toEqual({ t: "siphonShield", n: 5 });
  });
});

describe("the bot reads part intents", () => {
  it("counts an acting part's attack in incomingEstimate", () => {
    const enemy = spawned("beaconTrap");
    enemy.nextIntent = { t: "attack", n: 7 };
    partOf(enemy, "lensB").nextIntent = { t: "attack", n: 4 };
    const whole = boardWith(enemy);
    const stripped = boardWith({
      ...structuredClone(enemy),
      subsystems: enemy.subsystems.map((part) => ({ ...part, hp: 0 })),
    });

    expect(incomingEstimate(whole)).toBe(11);
    expect(incomingEstimate(stripped)).toBe(7);
    expect(incomingEstimate(whole)).toBeGreaterThan(incomingEstimate(stripped));
  });

  it("sees the part that is about to strip the shield", () => {
    const fresh = boardWith(spawned("beaconTrap"));
    expect(shieldsWasted(fresh)).toBe(false);

    const armed = resolveEnemyPhase(fresh, stream()).next;
    expect(coreOf(armed).nextIntent).toEqual({ t: "idle" });
    expect(shieldsWasted(armed)).toBe(true);
  });
});

const openBossWithFate = (seed: number): void => {
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.setState(createInitialBattleValues());
  useBattleStore
    .getState()
    .startBattle(
      { enemyIds: ["quarantineWarden"], hull: 240, hullMax: 240 },
      [FATE_DIE_ID, "slug"],
      createStreams(seed),
    );
};

const brokenPartId = (): string | undefined =>
  useBattleStore.getState().partsDowned[0];

describe("a part broken outside the player phase still gets its beat", () => {
  it("survives a real Fate roll and is drained by the next end turn", () => {
    let found: string | undefined;
    for (let seed = 1; seed <= 400 && found === undefined; seed += 1) {
      openBossWithFate(seed);
      useBattleStore.getState().rollFate();
      found = brokenPartId();
    }
    const partId = must(found, "no seed in 400 rolled a part-killing Fate");

    expect(
      useBattleStore.getState().enemies[0]?.subsystems.some(
        (part) => part.id === partId && part.hp === 0,
      ),
      "the part really died, outside the player phase",
    ).toBe(true);
    expect(useBattleStore.getState().partsDowned).toEqual([partId]);

    useBattleStore.getState().endTurn();

    const down = useBattleStore
      .getState()
      .beats.filter((b) => b.kind === "partDown");
    expect(down.map((b) => b.targetId)).toContain(partId);

    useBattleStore.getState().finishResolution();
    expect(useBattleStore.getState().partsDowned).toEqual([]);
  });
});
