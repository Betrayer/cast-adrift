import { beforeEach, describe, expect, it } from "vitest";
import { STARTER_DECK } from "@/data/decks";
import { echoToken } from "@/data/echo";
import { FATE_DIE_ID } from "@/data/fate";
import {
  harnessEnemy,
  harnessSnap,
} from "@/game/battle/battleHarness";
import { resolveEnemyPhase } from "@/game/battle/resolver";
import {
  createStream,
  createStreamFromState,
  createStreams,
} from "@/services/rng";
import {
  createInitialBattleValues,
  echoActiveDead,
  echoActiveSpent,
  useBattleStore,
} from "@/stores/battleStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import type { EchoNodeId } from "@/data/echo";
import type { BattleSnapshot } from "@/types/battle";

const seatBattle = (echo: EchoNodeId | undefined, seed = 42): void => {
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.setState(createInitialBattleValues());
  useBattleStore
    .getState()
    .startBattle(
      { enemyIds: ["raider"], echo },
      [...STARTER_DECK, FATE_DIE_ID],
      createStreams(seed),
    );
};

const seatRun = (echo: EchoNodeId | null): void => {
  useRunStore.getState().hydrate({
    ...createInitialRunValues(),
    active: true,
    hull: 30,
    hullMax: 30,
    echo,
  });
};

const flatten = (values: readonly number[]): number[] => [...values];

describe("Second Look — the reroll the baseline cannot buy", () => {
  beforeEach(() => {
    seatRun("secondLook");
  });

  it("rolls the two lowest tray dice again and keeps the better face", () => {
    seatBattle("secondLook");
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d, i) => ({ ...d, value: i < 2 ? 1 : 5 })),
    }));
    const before = useBattleStore.getState();
    const candidates = before.dice
      .filter((d) => d.state === "tray")
      .slice()
      .sort((a, b) => a.value - b.value)
      .slice(0, 2);
    expect(candidates).toHaveLength(2);
    if (before.streams === null) throw new Error("no streams");
    const mirror = createStreamFromState(before.streams.dice.state());
    const expected = new Map(
      candidates.map((d) => {
        const rolled = mirror.int(1, d.tier) + (d.growth ?? 0);
        return [d.uid, Math.max(d.value, rolled)];
      }),
    );
    const rerollsBefore = before.rerollsLeft;

    useBattleStore.getState().useEchoActive();

    const after = useBattleStore.getState();
    for (const d of after.dice) {
      const want = expected.get(d.uid);
      expect({ uid: d.uid, value: d.value }).toEqual({
        uid: d.uid,
        value: want ?? before.dice.find((b) => b.uid === d.uid)?.value,
      });
    }
    expect(after.rerollsLeft).toBe(rerollsBefore);
    expect(after.spentGrants).toContain(echoToken("secondLook"));
    expect(echoActiveSpent(after)).toBe(true);
  });

  it("never lowers a die, and refuses a second press in the same battle", () => {
    seatBattle("secondLook", 11);
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => ({ ...d, value: d.tier })),
    }));
    const before = flatten(useBattleStore.getState().dice.map((d) => d.value));
    useBattleStore.getState().useEchoActive();
    expect(flatten(useBattleStore.getState().dice.map((d) => d.value))).toEqual(
      before,
    );
    const afterFirst = useBattleStore.getState();
    useBattleStore.getState().useEchoActive();
    expect(useBattleStore.getState().spentGrants).toEqual(
      afterFirst.spentGrants,
    );
    expect(useBattleStore.getState().dice).toEqual(afterFirst.dice);
  });

  it("does nothing at all when no Echo node is equipped", () => {
    seatRun(null);
    seatBattle(undefined);
    const before = useBattleStore.getState();
    useBattleStore.getState().useEchoActive();
    expect(useBattleStore.getState().dice).toEqual(before.dice);
    expect(useBattleStore.getState().spentGrants).toEqual([]);
    expect(echoActiveSpent(useBattleStore.getState())).toBe(false);
  });

  it("reads dead when the tray is empty rather than spending for nothing", () => {
    seatBattle("secondLook");
    useBattleStore.setState((s) => ({
      dice: s.dice.map((d) => ({ ...d, state: "placed" as const })),
    }));
    expect(echoActiveDead(useBattleStore.getState())).toBe(true);
    useBattleStore.getState().useEchoActive();
    expect(useBattleStore.getState().spentGrants).toEqual([]);
  });
});

describe("Firing Solution — the volley the console buys", () => {
  beforeEach(() => {
    seatRun("calculus");
  });

  it("adds its weapons bonus once and only once", () => {
    seatBattle("calculus");
    expect(useBattleStore.getState().nextTurnMods.weapons).toBeUndefined();
    useBattleStore.getState().useEchoActive();
    expect(useBattleStore.getState().nextTurnMods.weapons).toBe(2);
    useBattleStore.getState().useEchoActive();
    expect(useBattleStore.getState().nextTurnMods.weapons).toBe(2);
    expect(useBattleStore.getState().spentGrants).toEqual([
      echoToken("calculus"),
    ]);
  });
});

describe("Shield Echo — a hit the shield swallows whole", () => {
  const enemyStream = () => createStream(5);
  const attacker = harnessEnemy({ nextIntent: { t: "attack", n: 5 } });
  const snapWith = (over: Partial<BattleSnapshot>): BattleSnapshot =>
    harnessSnap([], { enemies: [attacker], charge: 0, ...over });

  it("returns charge when the shield absorbs the whole hit", () => {
    const { next } = resolveEnemyPhase(
      snapWith({ shield: 10, echo: "shieldEcho" }),
      enemyStream(),
    );
    expect(next.hull).toBe(30);
    expect(next.charge).toBe(1);
  });

  it("returns nothing when the hit reaches the hull", () => {
    const { next } = resolveEnemyPhase(
      snapWith({ shield: 2, echo: "shieldEcho" }),
      enemyStream(),
    );
    expect(next.hull).toBeLessThan(30);
    expect(next.charge).toBe(0);
  });

  it("returns nothing without the node equipped", () => {
    const { next } = resolveEnemyPhase(
      snapWith({ shield: 10 }),
      enemyStream(),
    );
    expect(next.hull).toBe(30);
    expect(next.charge).toBe(0);
  });
});

describe("Veto — a Fate roll that would take the hull to zero", () => {
  const LETHAL_SEED = 3;

  it("leaves the hull at 1 and spends the run's single charge", () => {
    seatRun("veto");
    seatBattle("veto", LETHAL_SEED);
    useBattleStore.setState({ hull: 4 });
    useBattleStore.getState().rollFate();
    expect(useBattleStore.getState().fateOutcomeId).toBe("misfire");
    expect(useBattleStore.getState().hull).toBe(1);
    expect(useRunStore.getState().echoUsed).toBe(true);
  });

  it("lets the hull reach zero without the node equipped", () => {
    seatRun(null);
    seatBattle(undefined, LETHAL_SEED);
    useBattleStore.setState({ hull: 4 });
    useBattleStore.getState().rollFate();
    expect(useBattleStore.getState().fateOutcomeId).toBe("misfire");
    expect(useBattleStore.getState().hull).toBe(0);
    expect(useRunStore.getState().echoUsed).toBe(false);
  });

  it("does not fire twice, and does not fire on a survivable roll", () => {
    seatRun("veto");
    seatBattle("veto", LETHAL_SEED);
    useBattleStore.setState({ hull: 30 });
    useBattleStore.getState().rollFate();
    expect(useBattleStore.getState().hull).toBe(26);
    expect(useRunStore.getState().echoUsed).toBe(false);
  });
});
