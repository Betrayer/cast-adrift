import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STARTER_DECK } from "@/data/decks";
import {
  harnessDie,
  harnessEnemy,
  harnessSnap,
  place,
} from "@/game/battle/battleHarness";
import {
  advanceTurn,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import { injectEffectSource } from "@/game/effects/pipeline";
import type { BattleEndInfo, Hook, HookPayload } from "@/game/effects/types";
import { applyOutcome } from "@/game/events/apply";
import { abandonRun, jumpTo, startRun } from "@/game/run/flow";
import { enterShop } from "@/game/run/shopEntry";
import { START_NODE_ID } from "@/game/map/generator";
import { outgoingEdges } from "@/game/map/types";
import { createStream, createStreams } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";

interface ProbeCall {
  hook: Hook;
  subject: string | null;
  payload: HookPayload;
}

let calls: ProbeCall[] = [];
let dispose: (() => void) | null = null;

const countOf = (hook: Hook): number =>
  calls.filter((c) => c.hook === hook).length;

const firstOf = (hook: Hook): ProbeCall | undefined =>
  calls.find((c) => c.hook === hook);

beforeEach(() => {
  calls = [];
  dispose = injectEffectSource({
    key: "probe",
    run: (hook, ctx, subject) => {
      calls.push({
        hook,
        subject: subject?.uid ?? null,
        payload: { ...ctx.payload },
      });
    },
  });
});

afterEach(() => {
  dispose?.();
  dispose = null;
});

describe("battle hook emission", () => {
  it("battleStart fires once when the battle store opens a battle", () => {
    useBattleStore
      .getState()
      .startBattle({ enemyIds: ["raider"] }, STARTER_DECK, createStreams(3));
    expect(countOf("battleStart")).toBe(1);
  });

  it("place fires once per placement, carrying the die and slot", () => {
    useBattleStore
      .getState()
      .startBattle({ enemyIds: ["raider"] }, STARTER_DECK, createStreams(3));
    calls = [];
    const die = useBattleStore.getState().dice[0];
    if (die === undefined) throw new Error("no die");
    useBattleStore.getState().placeDie(die.uid, "weaponA");
    expect(countOf("place")).toBe(1);
    expect(firstOf("place")?.payload.slot).toBe("weaponA");
    expect(firstOf("place")?.payload.die?.uid).toBe(die.uid);
  });

  it("rollStart fires once per turn advance, rolled once per rolled die", () => {
    const dice = [harnessDie("a", "red-d6", 3), harnessDie("b", "blue-d6", 4)];
    const snap = harnessSnap(dice);
    advanceTurn(snap, createStreams(11));
    expect(countOf("rollStart")).toBe(1);
    expect(countOf("rolled")).toBe(dice.length);
  });

  it("slot hooks and turnEnd fire around the player phase", () => {
    const die = harnessDie("a", "red-d6", 4);
    const snap = harnessSnap([die]);
    place(snap, "a", "weaponA");
    resolvePlayerPhase(snap);
    expect(countOf("beforeResolveSlot")).toBe(1);
    expect(countOf("afterResolveSlot")).toBe(1);
    expect(countOf("turnEnd")).toBe(1);
    expect(firstOf("turnEnd")?.subject).toBeNull();
  });

  it("battleEnd fires once on victory and reports turns and overkill", () => {
    const die = harnessDie("a", "grey-d4", 4);
    const snap = harnessSnap([die], {
      enemies: [harnessEnemy({ hp: 1, hpMax: 1 })],
    });
    place(snap, "a", "weaponA");
    const { next } = resolvePlayerPhase(snap);
    expect(next.outcome).toBe("victory");
    expect(countOf("battleEnd")).toBe(1);
    const info: BattleEndInfo | undefined = firstOf("battleEnd")?.payload
      .battleEnd;
    expect(info?.outcome).toBe("victory");
    expect(info?.turns).toBe(1);
    expect(info?.overkill).toBe(3);
  });

  it("enemyTurnEnd fires once per enemy phase", () => {
    const snap = harnessSnap([harnessDie("a", "red-d6", 3)]);
    resolveEnemyPhase(snap, createStream(5));
    expect(countOf("enemyTurnEnd")).toBe(1);
  });

  it("battleEnd fires once on defeat", () => {
    const snap = harnessSnap([harnessDie("a", "red-d6", 3)], {
      hull: 1,
      enemies: [harnessEnemy({ nextIntent: { t: "attack", n: 40 } })],
    });
    const { next } = resolveEnemyPhase(snap, createStream(5));
    expect(next.outcome).toBe("defeat");
    expect(countOf("battleEnd")).toBe(1);
    expect(firstOf("battleEnd")?.payload.battleEnd?.outcome).toBe("defeat");
  });
});

describe("run hook emission", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu" });
  });

  it("nodeEnter fires once per jump, carrying the node", () => {
    startRun(42);
    const map = useRunStore.getState().map;
    if (map === null) throw new Error("map missing");
    const target = outgoingEdges(map, START_NODE_ID)[0];
    if (target === undefined) throw new Error("no outgoing edge");
    calls = [];
    expect(jumpTo(target)).toBe(true);
    expect(countOf("nodeEnter")).toBe(1);
    expect(firstOf("nodeEnter")?.payload.node?.nodeId).toBe(target);
    expect(firstOf("nodeEnter")?.payload.node?.sector).toBe(1);
  });

  it("eventOutcome fires once per applied outcome", () => {
    startRun(42);
    calls = [];
    applyOutcome(
      { text: "content:events.test", effects: [{ k: "scrap", n: 1 }] },
      createStream(1),
      { eventId: "probe", optionId: "probeOpt", optionIndex: 2 },
    );
    expect(countOf("eventOutcome")).toBe(1);
    expect(firstOf("eventOutcome")?.payload.event?.eventId).toBe("probe");
    expect(firstOf("eventOutcome")?.payload.event?.optionIndex).toBe(2);
  });

  it("shopEnter fires once when the shop stocks for a node", () => {
    startRun(42);
    calls = [];
    expect(enterShop("r1l0")).toBe(true);
    expect(countOf("shopEnter")).toBe(1);
    expect(firstOf("shopEnter")?.payload.shop?.nodeId).toBe("r1l0");
    expect(enterShop("r1l0")).toBe(false);
    expect(countOf("shopEnter")).toBe(1);
  });
});
