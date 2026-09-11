import { beforeEach, describe, expect, it } from "vitest";
import { START_NODE_ID } from "@/game/map/generator";
import { outgoingEdges, type MapGraph, type NodeId } from "@/game/map/types";
import {
  abandonRun,
  banishPerkChoice,
  completeNode,
  jumpTo,
  rerollPerkDraft,
  startRun,
} from "@/game/run/flow";
import { ALL_PERKS } from "@/data/perks";
import { useAppStore } from "@/stores/appStore";
import { useRunStore } from "@/stores/runStore";

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
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [...offered],
      draftNodeId: START_NODE_ID,
    });

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
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [...offered],
      draftNodeId: START_NODE_ID,
    });

    banishPerkChoice(ALL_PERKS[9]?.id ?? "nope");

    expect(useRunStore.getState().pendingRewards?.perkChoices).toEqual(offered);
    expect(useRunStore.getState().banishUsed).toBe(false);
  });

  it("a paid reroll cannot hand back the hand it replaced", () => {
    startRun(7);
    const offered = ALL_PERKS.slice(0, 3).map((p) => p.id);
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [...offered],
      draftNodeId: START_NODE_ID,
    });
    useRunStore.getState().addScrap(100);

    rerollPerkDraft();

    const after = useRunStore.getState().pendingRewards?.perkChoices ?? [];
    expect(after).toHaveLength(3);
    for (const id of offered) expect(after).not.toContain(id);
  });
});
