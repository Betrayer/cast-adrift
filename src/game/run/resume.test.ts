import { beforeEach, describe, expect, it } from "vitest";
import { START_NODE_ID } from "@/game/map/generator";
import { outgoingEdges, type NodeType } from "@/game/map/types";
import { abandonRun, autosaveRun, jumpTo, startRun } from "@/game/run/flow";
import { readLocalResume, resumeLocalRun } from "@/game/run/resume";
import {
  captureRunSnapshot,
  restoreRunSnapshot,
} from "@/game/run/snapshot";
import { loadRunSnapshot } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";

const findStartAdjacent = (type: NodeType): string | null => {
  const map = useRunStore.getState().map;
  if (map === null) return null;
  for (const id of outgoingEdges(map, START_NODE_ID)) {
    const node = map.nodes.find((n) => n.id === id);
    if (node?.type === type) return id;
  }
  return null;
};

describe("save / resume", () => {
  beforeEach(() => {
    abandonRun();
    useAppStore.setState({ screen: "menu" });
  });

  it("round-trips a fresh run through local storage", () => {
    startRun(1);
    const beforeScrap = useRunStore.getState().scrap;
    const beforeDeck = useRunStore.getState().deck.length;
    const beforePos = useRunStore.getState().position;

    const persisted = loadRunSnapshot();
    expect(persisted).not.toBeNull();

    useRunStore.getState().reset();
    useAppStore.setState({ screen: "menu" });
    expect(resumeLocalRun()).toBe(true);

    expect(useRunStore.getState().scrap).toBe(beforeScrap);
    expect(useRunStore.getState().deck.length).toBe(beforeDeck);
    expect(useRunStore.getState().position).toBe(beforePos);
    expect(useAppStore.getState().screen).toBe("map");
  });

  it("restores a mid-battle placement exactly", () => {
    let seed = 1;
    let battleNode: string | null = null;
    while (battleNode === null && seed < 60) {
      startRun(seed);
      battleNode = findStartAdjacent("battle");
      if (battleNode === null) seed += 1;
    }
    expect(battleNode).not.toBeNull();
    if (battleNode === null) return;

    jumpTo(battleNode);
    expect(useAppStore.getState().screen).toBe("battle");
    expect(useBattleStore.getState().phase).toBe("placement");

    const tray = useBattleStore.getState().dice.find((d) => d.state === "tray");
    expect(tray).toBeDefined();
    if (tray !== undefined) useBattleStore.getState().placeDie(tray.uid, "weaponA");

    const snap = captureRunSnapshot();
    const beforeDice = useBattleStore
      .getState()
      .dice.map((d) => `${d.uid}:${d.state}:${String(d.value)}`);
    const beforeHull = useBattleStore.getState().hull;

    useRunStore.getState().reset();
    useBattleStore.getState().reset();
    useAppStore.setState({ screen: "menu" });

    expect(restoreRunSnapshot(snap)).toBe(true);
    expect(useAppStore.getState().screen).toBe("battle");
    expect(useBattleStore.getState().phase).toBe("placement");
    expect(useBattleStore.getState().hull).toBe(beforeHull);
    const afterDice = useBattleStore
      .getState()
      .dice.map((d) => `${d.uid}:${d.state}:${String(d.value)}`);
    expect(afterDice).toEqual(beforeDice);
    expect(
      useBattleStore.getState().dice.find((d) => d.slot === "weaponA"),
    ).toBeDefined();
  });

  it("readLocalResume ignores a finished run", () => {
    startRun(1);
    expect(readLocalResume()).not.toBeNull();
    useRunStore.setState({ active: false });
    autosaveRun();
    expect(readLocalResume()).toBeNull();
  });
});
