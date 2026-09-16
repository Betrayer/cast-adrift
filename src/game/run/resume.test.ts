import { beforeEach, describe, expect, it } from "vitest";
import { START_NODE_ID } from "@/game/map/generator";
import { outgoingEdges, type NodeType } from "@/game/map/types";
import {
  abandonRun,
  autosaveRun,
  jumpTo,
  resumeUnenteredNode,
  startEventBattle,
  startRun,
} from "@/game/run/flow";
import { readLocalResume, resumeLocalRun } from "@/game/run/resume";
import {
  captureRunSnapshot,
  restoreRunSnapshot,
  RUN_SNAPSHOT_ACCEPTED,
  RUN_SNAPSHOT_V,
} from "@/game/run/snapshot";
import { loadRunSnapshot } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { LAST_BATTLE_LOG_CAP, useRunStore } from "@/stores/runStore";

const findStartAdjacent = (type: NodeType): string | null => {
  const map = useRunStore.getState().map;
  if (map === null) return null;
  for (const id of outgoingEdges(map, START_NODE_ID)) {
    const node = map.nodes.find((n) => n.id === id);
    if (node?.type === type) return id;
  }
  return null;
};

const startAtBattleNode = (): string => {
  for (let seed = 1; seed < 60; seed += 1) {
    startRun(seed);
    const node = findStartAdjacent("battle");
    if (node !== null) return node;
  }
  throw new Error("no seed under 60 starts next to a battle node");
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
    expect(useAppStore.getState().screen).toBe("interstitial");
  });

  it("restores a mid-battle placement exactly", () => {
    const battleNode = startAtBattleNode();

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

  it("carries the last battle log across a save so the tab is never empty", () => {
    startRun(1);
    const log = Array.from({ length: 90 }, (_, i) => ({
      id: `e${String(i)}`,
      turn: Math.floor(i / 6) + 1,
      side: "you" as const,
      kind: "damage" as const,
      actor: "weaponA",
      amount: i,
      hull: 0,
      shield: 0,
      dodged: 0,
      glanced: 0,
    }));
    useRunStore.getState().keepBattleLog(log);
    expect(useRunStore.getState().lastBattleLog).toHaveLength(
      LAST_BATTLE_LOG_CAP,
    );
    const snap = captureRunSnapshot();
    expect(snap.v).toBe(RUN_SNAPSHOT_V);
    useRunStore.getState().reset();
    expect(useRunStore.getState().lastBattleLog).toHaveLength(0);
    expect(restoreRunSnapshot(snap)).toBe(true);
    const restored = useRunStore.getState().lastBattleLog;
    expect(restored).toHaveLength(LAST_BATTLE_LOG_CAP);
    expect(restored[restored.length - 1]?.id).toBe("e89");
  });

  it("still accepts a snapshot written before the battle log rode along", () => {
    startRun(1);
    const snap = captureRunSnapshot();
    expect(RUN_SNAPSHOT_ACCEPTED).toContain(12);
    const legacy = {
      ...snap,
      v: 12,
      run: Object.fromEntries(
        Object.entries(snap.run).filter(([key]) => key !== "lastBattleLog"),
      ),
    };
    useRunStore.getState().reset();
    expect(restoreRunSnapshot(legacy)).toBe(true);
    expect(useRunStore.getState().lastBattleLog).toEqual([]);
  });

  it("parks a mid-fight journal visit on the fight, not on the map", () => {
    const battleNode = startAtBattleNode();
    const map = useRunStore.getState().map;
    expect(map).not.toBeNull();
    if (map === null) return;

    useRunStore.setState({
      map: {
        ...map,
        nodes: map.nodes.map((node) =>
          node.id === battleNode ? { ...node, cache: true } : node,
        ),
      },
    });

    const scrapBefore = useRunStore.getState().scrap;
    jumpTo(battleNode);
    expect(useAppStore.getState().screen).toBe("battle");
    const scrapAfterEntry = useRunStore.getState().scrap;
    expect(scrapAfterEntry).toBeGreaterThan(scrapBefore);

    const tray = useBattleStore.getState().dice.find((d) => d.state === "tray");
    expect(tray).toBeDefined();
    if (tray !== undefined) {
      useBattleStore.getState().placeDie(tray.uid, "weaponA");
    }
    const beforeDice = useBattleStore
      .getState()
      .dice.map((d) => `${d.uid}:${d.state}:${String(d.value)}`);

    for (const parked of ["journal", "codex", "settings", "bridge"] as const) {
      useAppStore.setState({ screen: parked });
      expect(captureRunSnapshot().screen).toBe("battle");
    }

    useAppStore.setState({ screen: "journal" });
    const snap = captureRunSnapshot();
    expect(snap.screen).toBe("battle");
    expect(snap.battle).not.toBeNull();

    useRunStore.getState().reset();
    useBattleStore.getState().reset();
    useAppStore.setState({ screen: "menu" });
    expect(restoreRunSnapshot(snap)).toBe(true);
    if (useAppStore.getState().screen === "map") resumeUnenteredNode();

    expect(useAppStore.getState().screen).toBe("battle");
    expect(useRunStore.getState().scrap).toBe(scrapAfterEntry);
    expect(useRunStore.getState().visited).not.toContain(battleNode);
    expect(
      useBattleStore
        .getState()
        .dice.map((d) => `${d.uid}:${d.state}:${String(d.value)}`),
    ).toEqual(beforeDice);
  });

  it("drops a mid-fight blob written before the part rework and keeps the run", () => {
    const battleNode = startAtBattleNode();
    jumpTo(battleNode);
    const snap = captureRunSnapshot();
    expect(snap.battle).not.toBeNull();
    expect(snap.screen).toBe("battle");
    const scrap = useRunStore.getState().scrap;

    useRunStore.getState().reset();
    useBattleStore.getState().reset();
    useAppStore.setState({ screen: "menu" });
    expect(restoreRunSnapshot({ ...snap, v: RUN_SNAPSHOT_V - 1 })).toBe(true);

    expect(useAppStore.getState().screen).toBe("map");
    expect(useBattleStore.getState().phase).toBe("idle");
    expect(useRunStore.getState().active).toBe(true);
    expect(useRunStore.getState().scrap).toBe(scrap);
    expect(useRunStore.getState().position).toBe(battleNode);
    expect(useRunStore.getState().visited).not.toContain(battleNode);

    expect(resumeUnenteredNode()).toBe(true);
    expect(useAppStore.getState().screen).toBe("battle");
    expect(useBattleStore.getState().phase).toBe("placement");
    expect(useBattleStore.getState().turn).toBe(1);
  });

  it("drops the pending event fight with a blob written before the part rework", () => {
    startRun(1);
    startEventBattle({
      enemyIds: ["scavDrone"],
      scrap: 15,
      loot: { rarity: "rare" },
      setFlags: [["prologueRun", true]],
    });
    expect(useAppStore.getState().screen).toBe("battle");
    expect(useRunStore.getState().pendingBattle).not.toBeNull();

    const snap = captureRunSnapshot();
    expect(snap.battle).not.toBeNull();
    expect(snap.run.pendingBattle).not.toBeNull();

    useRunStore.getState().reset();
    useBattleStore.getState().reset();
    useAppStore.setState({ screen: "menu" });
    expect(restoreRunSnapshot({ ...snap, v: RUN_SNAPSHOT_V - 1 })).toBe(true);

    expect(useAppStore.getState().screen).toBe("map");
    expect(useBattleStore.getState().phase).toBe("idle");
    expect(useRunStore.getState().active).toBe(true);
    expect(useRunStore.getState().pendingBattle).toBeNull();
  });

  it("still carries a mid-fight blob written by this build", () => {
    const battleNode = startAtBattleNode();
    jumpTo(battleNode);
    const snap = captureRunSnapshot();

    useRunStore.getState().reset();
    useBattleStore.getState().reset();
    useAppStore.setState({ screen: "menu" });
    expect(restoreRunSnapshot(snap)).toBe(true);

    expect(useAppStore.getState().screen).toBe("battle");
    expect(useBattleStore.getState().phase).toBe("placement");
  });

  it("still parks every stacked run-context screen on the map with no fight running", () => {
    startRun(1);
    expect(useBattleStore.getState().phase).toBe("idle");
    for (const screen of ["bridge", "journal", "codex", "settings"] as const) {
      useAppStore.setState({ screen });
      const snap = captureRunSnapshot();
      expect(snap.battle).toBeNull();
      expect(snap.screen).toBe("map");
    }
  });
  it("readLocalResume ignores a finished run", () => {
    startRun(1);
    expect(readLocalResume()).not.toBeNull();
    useRunStore.setState({ active: false });
    autosaveRun();
    expect(readLocalResume()).toBeNull();
  });
});
