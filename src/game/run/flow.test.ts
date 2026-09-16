import { beforeEach, describe, expect, it } from "vitest";
import { START_NODE_ID } from "@/game/map/generator";
import { outgoingEdges, type MapGraph, type NodeId } from "@/game/map/types";
import {
  abandonRun,
  applyPerkPick,
  banishPerkChoice,
  completeNode,
  endRun,
  jumpTo,
  rerollPerkDraft,
  resolveRunBattle,
  startRun,
} from "@/game/run/flow";
import { ALL_PERKS } from "@/data/perks";
import { STARTER_DECK } from "@/data/decks";
import { deckPoints } from "@/data/metaShop";
import { hangarBudget } from "@/data/milestones";
import { DECK_CAP } from "@/game/economy/prices";
import { totalXpForLevel } from "@/game/xp";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import {
  createInitialMetaStats,
  useMetaStore,
  type MetaValues,
} from "@/stores/metaStore";
import { createInitialRunStats, useRunStore } from "@/stores/runStore";
import { useSummaryStore } from "@/stores/summaryStore";

const pathFrom = (map: MapGraph, start: NodeId, len: number): NodeId[] => {
  const path: NodeId[] = [];
  let cur = start;
  for (let i = 0; i < len; i += 1) {
    const next = outgoingEdges(map, cur)[0];
    if (next === undefined) break;
    path.push(next);
    cur = next;
  }
  return path;
};

const offerPerks = (ids: readonly string[]): void => {
  useRunStore.getState().setPendingRewards({
    dieDrop: null,
    perkChoices: [...ids],
    draftNodeId: START_NODE_ID,
  });
};

describe("run flow", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu" });
  });

  it("startRun seeds a run positioned at the start node and opens the map", () => {
    startRun(42);
    const s = useRunStore.getState();
    expect(s.active).toBe(true);
    expect(s.position).toBe(START_NODE_ID);
    expect(s.visited).toContain(START_NODE_ID);
    expect(s.map).not.toBeNull();
    expect(s.deck.length).toBeGreaterThan(0);
    expect(useAppStore.getState().screen).toBe("interstitial");
  });

  it("rejects an illegal jump to an unconnected node", () => {
    startRun(42);
    const before = useRunStore.getState().position;
    expect(jumpTo("r9l0")).toBe(false);
    expect(jumpTo("does-not-exist")).toBe(false);
    expect(useRunStore.getState().position).toBe(before);
  });

  it("raises tide on the 4th jump", () => {
    startRun(7);
    const map = useRunStore.getState().map;
    if (map === null) throw new Error("map missing");
    const path = pathFrom(map, START_NODE_ID, 4);
    expect(path.length).toBe(4);
    for (let i = 0; i < 3; i += 1) {
      expect(jumpTo(path[i] as NodeId)).toBe(true);
      expect(useRunStore.getState().tide).toBe(0);
    }
    expect(jumpTo(path[3] as NodeId)).toBe(true);
    expect(useRunStore.getState().tide).toBe(1);
    expect(useRunStore.getState().jumpsSinceTide).toBe(0);
  });

  it("completeNode applies rewards and returns to the map", () => {
    startRun(7);
    const map = useRunStore.getState().map;
    if (map === null) throw new Error("map missing");
    const first = outgoingEdges(map, START_NODE_ID)[0];
    if (first === undefined) throw new Error("no first node");
    jumpTo(first);
    completeNode({ outcome: "cleared", scrap: 15, setHull: 20 });
    const s = useRunStore.getState();
    expect(s.scrap).toBe(15);
    expect(s.hull).toBe(20);
    expect(s.visited).toContain(first);
    expect(s.stats.nodesCleared).toBe(1);
    expect(useAppStore.getState().screen).toBe("map");
  });

  it("banish replaces the banished card only, and never re-offers the kept two", () => {
    startRun(7);
    const offered = ALL_PERKS.slice(0, 3).map((p) => p.id);
    offerPerks(offered);

    banishPerkChoice(offered[1] as string);

    const after = useRunStore.getState().pendingRewards?.perkChoices ?? [];
    expect(after).toHaveLength(3);
    expect(after[0]).toBe(offered[0]);
    expect(after[1]).toBe(offered[2]);
    expect(after).not.toContain(offered[1]);
    expect(new Set(after).size).toBe(3);
    expect(useRunStore.getState().banishedPerks).toContain(offered[1]);
  });

  it("banish refuses a card that was not on the table", () => {
    startRun(7);
    const offered = ALL_PERKS.slice(0, 3).map((p) => p.id);
    offerPerks(offered);

    banishPerkChoice(ALL_PERKS[9]?.id ?? "nope");

    expect(useRunStore.getState().pendingRewards?.perkChoices).toEqual(offered);
    expect(useRunStore.getState().banishUsed).toBe(false);
  });

  it("a paid reroll cannot hand back the hand it replaced", () => {
    startRun(7);
    const offered = ALL_PERKS.slice(0, 3).map((p) => p.id);
    offerPerks(offered);
    useRunStore.getState().addScrap(100);

    rerollPerkDraft();

    const after = useRunStore.getState().pendingRewards?.perkChoices ?? [];
    expect(after).toHaveLength(3);
    for (const id of offered) expect(after).not.toContain(id);
  });
});

const seedProfile = (patch: Partial<MetaValues> = {}): void => {
  useMetaStore.setState({
    xp: 0,
    level: 1,
    shards: 0,
    chartPicks: [],
    achievements: [],
    unlocksGranted: [],
    unlocksSeen: [],
    ascension: { campaign: 0 },
    stats: createInitialMetaStats(),
    ...patch,
  });
};

const finishRunAt = (nodesCleared: number, win = false): void => {
  useRunStore.setState({
    active: true,
    hull: 30,
    hullMax: 30,
    stats: { ...createInitialRunStats(), nodesCleared },
  });
  endRun(win);
};

describe("level-up ceremony cards", () => {
  beforeEach(() => {
    abandonRun();
    useSummaryStore.getState().clear();
    useAppStore.setState({ screen: "menu" });
  });

  it("announces a feature unlock once and never again", () => {
    seedProfile({ xp: totalXpForLevel(10) - 2, level: 9 });

    finishRunAt(1);
    const first = useSummaryStore.getState().result;
    expect(first?.fromLevel).toBe(9);
    expect(first?.toLevel).toBe(10);
    expect(first?.unlockIds).toContain("featureShipRam");

    finishRunAt(43);
    const second = useSummaryStore.getState().result;
    expect(second?.fromLevel).toBe(10);
    expect(second?.toLevel).toBe(11);
    expect(second?.unlockIds).not.toContain("featureShipRam");
  });

  it("leaves wave badges for the screens that own them", () => {
    seedProfile({ xp: totalXpForLevel(10) - 2, level: 9 });

    finishRunAt(1);
    const seen = useMetaStore.getState().unlocksSeen;
    expect(seen).toContain("featureShipRam");
    expect(seen).not.toContain("diceL8");
  });

  it("keeps an unannounced unlock fresh when the run did not level up", () => {
    seedProfile({ xp: totalXpForLevel(10), level: 10 });

    finishRunAt(0);
    const result = useSummaryStore.getState().result;
    expect(result?.toLevel).toBe(result?.fromLevel);
    expect(useMetaStore.getState().unlocksSeen).not.toContain("featureShipRam");
  });
});

describe("hangar budget at run start", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu" });
  });

  const runDeck = (): string[] =>
    useRunStore.getState().deck.map((d) => d.defId);

  it("trims a saved deck that no longer fits the live budget", () => {
    const budget = hangarBudget(1);
    const overBudget = Array.from<string>({ length: DECK_CAP }).fill("red-d6");
    expect(deckPoints(overBudget)).toBeGreaterThan(budget);
    seedProfile({ hangar: { deck: overBudget } });

    startRun(99);

    expect(deckPoints(runDeck())).toBeLessThanOrEqual(budget);
    expect(runDeck().length).toBeGreaterThanOrEqual(3);
    expect(useMetaStore.getState().hangar.deck).toEqual(runDeck());
  });

  it("leaves a deck that fits the budget exactly as saved", () => {
    seedProfile({ hangar: { deck: [...STARTER_DECK] } });

    startRun(99);

    expect(runDeck()).toEqual([...STARTER_DECK]);
    expect(useMetaStore.getState().hangar.deck).toEqual([...STARTER_DECK]);
  });
});

describe("perk hull cost", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu" });
    seedProfile({ hangar: { deck: [...STARTER_DECK] } });
  });

  it("charges the printed hull drawback and clamps the current hull", () => {
    startRun(5);
    const before = useRunStore.getState().hullMax;

    applyPerkPick("looseBallast");

    const after = useRunStore.getState();
    expect(after.perks).toContain("looseBallast");
    expect(after.hullMax).toBe(before - 3);
    expect(after.hull).toBe(before - 3);
  });

  it("still grants the printed hull bonus and heals by it", () => {
    startRun(5);
    const before = useRunStore.getState().hullMax;
    useRunStore.setState({ hull: before - 5 });

    applyPerkPick("plating");

    const after = useRunStore.getState();
    expect(after.hullMax).toBe(before + 5);
    expect(after.hull).toBe(before);
  });

  it("never lets stacked drawbacks drive the hull maximum to zero", () => {
    startRun(5);
    useRunStore.setState({ hullMax: 2, hull: 2 });

    applyPerkPick("looseBallast");

    expect(useRunStore.getState().hullMax).toBe(1);
    expect(useRunStore.getState().hull).toBe(1);
  });
});

describe("deathless streak", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu" });
    seedProfile();
  });

  const streak = (): number => useMetaStore.getState().stats.noDeathStreak;

  it("keeps counting campaign clears across a cleared contract run", () => {
    finishRunAt(1, true);
    expect(streak()).toBe(1);

    useRunStore.setState({ mode: "contract", contractId: null });
    finishRunAt(1, true);
    expect(streak()).toBe(1);

    useRunStore.setState({ mode: "campaign" });
    finishRunAt(1, true);
    expect(streak()).toBe(2);
  });

  it("still breaks the streak on a campaign death", () => {
    finishRunAt(1, true);
    expect(streak()).toBe(1);

    finishRunAt(1, false);
    expect(streak()).toBe(0);
  });
});

describe("death cause", () => {
  beforeEach(() => {
    abandonRun();
    useSummaryStore.getState().clear();
    useAppStore.setState({ screen: "menu" });
    seedProfile();
  });

  it("records a battle wipe as a hull loss, not an abandon", () => {
    startRun(3);
    expect(useRunStore.getState().hull).toBeGreaterThan(0);
    useBattleStore.setState({ outcome: "defeat", hull: 0, turn: 4 });

    resolveRunBattle();

    expect(useSummaryStore.getState().result?.cause).toBe("hull");
  });
});
