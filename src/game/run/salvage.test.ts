import { beforeEach, describe, expect, it } from "vitest";
import {
  drawSalvageOffer,
  SALVAGE_DISCOUNT_SCRAP,
  SALVAGE_FACES,
  SALVAGE_OFFER_SIZE,
  SALVAGE_RECON_ROWS,
  SALVAGE_REPAIR,
  SALVAGE_SCRAP,
} from "@/data/salvage";
import {
  ACT_SCOPED_FACES,
  applySalvageFace,
  isSalvageNode,
  rollSalvageOffer,
  salvageStreamFor,
} from "@/game/run/salvage";
import {
  abandonRun,
  advanceSector,
  jumpTo,
  resolveRunBattle,
  resolveSalvagePick,
  startRun,
  startRunMode,
} from "@/game/run/flow";
import { isSectorExitRow } from "@/game/run/modes";
import { START_NODE_ID } from "@/game/map/generator";
import { outgoingEdges } from "@/game/map/types";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { createStream, deriveSeed } from "@/services/rng";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";

const seatRun = (): void => {
  useRunStore.getState().hydrate({
    ...createInitialRunValues(),
    active: true,
    seed: 4242,
    sector: 2,
    sectorIndex: 2,
    position: "n-1",
    hull: 20,
    hullMax: 30,
    scrap: 100,
  });
};

describe("salvage offer", () => {
  beforeEach(() => {
    useNarrativeStore.getState().reset();
    seatRun();
  });

  it("offers three distinct faces and always leaves one out", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const offer = rollSalvageOffer(seed, `elite-${String(seed)}`);
      expect(offer).toHaveLength(SALVAGE_OFFER_SIZE);
      expect(new Set(offer).size).toBe(SALVAGE_OFFER_SIZE);
      expect(offer.length).toBeLessThan(SALVAGE_FACES.length);
      for (const id of offer) {
        expect(SALVAGE_FACES.some((face) => face.id === id)).toBe(true);
      }
    }
  });

  it("draws every face over the seed range, so no face is unreachable", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      for (const id of rollSalvageOffer(seed, "n-1")) seen.add(id);
    }
    expect(seen.size).toBe(SALVAGE_FACES.length);
  });

  it("is stable for a seed and node, and independent of the loot stream", () => {
    const first = rollSalvageOffer(99, "elite-7");
    const again = rollSalvageOffer(99, "elite-7");
    expect(again).toEqual(first);

    const loot = createStream(deriveSeed(99, "loot:elite-7"));
    loot.int(45, 60);
    loot.next();
    expect(rollSalvageOffer(99, "elite-7")).toEqual(first);
  });

  it("draws only the faces the table still holds when the offer is oversized", () => {
    const offer = drawSalvageOffer(createStream(7), SALVAGE_FACES.length + 3);
    expect(offer).toHaveLength(SALVAGE_FACES.length);
  });

  it("fires only on elite and miniboss nodes", () => {
    expect(isSalvageNode("elite")).toBe(true);
    expect(isSalvageNode("miniboss")).toBe(true);
    expect(isSalvageNode("battle")).toBe(false);
    expect(isSalvageNode("boss")).toBe(false);
    expect(isSalvageNode("event")).toBe(false);
  });
});

describe("salvage faces", () => {
  beforeEach(() => {
    useNarrativeStore.getState().reset();
    seatRun();
  });

  it("scrap pays a flat number", () => {
    const before = useRunStore.getState().scrap;
    applySalvageFace("scrap", salvageStreamFor(1, "n-1"));
    expect(useRunStore.getState().scrap).toBe(before + SALVAGE_SCRAP);
  });

  it("repair welds hull and never overfills", () => {
    applySalvageFace("repair", salvageStreamFor(1, "n-1"));
    expect(useRunStore.getState().hull).toBe(20 + SALVAGE_REPAIR);
    useRunStore.setState({ hull: 29 });
    applySalvageFace("repair", salvageStreamFor(1, "n-1"));
    expect(useRunStore.getState().hull).toBe(30);
  });

  it("recon adds sector sight, not the per-jump kind", () => {
    applySalvageFace("recon", salvageStreamFor(1, "n-1"));
    expect(useRunStore.getState().sectorReveal).toBe(SALVAGE_RECON_ROWS);
    expect(useRunStore.getState().bonusReveal).toBe(0);
  });

  it("discount stacks into the shipyard discount", () => {
    applySalvageFace("discount", salvageStreamFor(1, "n-1"));
    expect(useRunStore.getState().shipyardDiscount).toBe(SALVAGE_DISCOUNT_SCRAP);
  });

  it("announces through the consequence feed, once per pick", () => {
    applySalvageFace("scrap", salvageStreamFor(1, "n-1"));
    const feed = useNarrativeStore
      .getState()
      .feed.filter((entry) => entry.source === "consequence");
    expect(feed).toHaveLength(1);
    expect(feed[0]?.key).toBe("content:salvage.scrap.line");
  });

  it("ignores a face id that is not in the table", () => {
    const before = useRunStore.getState().scrap;
    expect(applySalvageFace("engraving", salvageStreamFor(1, "n-1"))).toBe(false);
    expect(useRunStore.getState().scrap).toBe(before);
  });
});

describe("salvage pick resolution", () => {
  beforeEach(() => {
    useNarrativeStore.getState().reset();
    seatRun();
  });

  it("takes the picked face and clears the offer", () => {
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [],
      salvage: ["scrap", "repair", "recon"],
      draftNodeId: "n-1",
    });
    const before = useRunStore.getState().scrap;
    resolveSalvagePick("scrap");
    expect(useRunStore.getState().scrap).toBe(before + SALVAGE_SCRAP);
    expect(useRunStore.getState().pendingRewards?.salvage).toEqual([]);
  });

  it("declining takes nothing but still closes the card", () => {
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [],
      salvage: ["scrap", "repair", "recon"],
      draftNodeId: "n-1",
    });
    const before = useRunStore.getState();
    resolveSalvagePick(null);
    const after = useRunStore.getState();
    expect(after.scrap).toBe(before.scrap);
    expect(after.hull).toBe(before.hull);
    expect(after.sectorReveal).toBe(0);
    expect(after.shipyardDiscount).toBe(0);
    expect(after.pendingRewards?.salvage).toEqual([]);
  });

  it("refuses a face that was not offered", () => {
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [],
      salvage: ["repair", "recon", "discount"],
      draftNodeId: "n-1",
    });
    const before = useRunStore.getState().scrap;
    resolveSalvagePick("scrap");
    expect(useRunStore.getState().scrap).toBe(before);
    expect(useRunStore.getState().pendingRewards?.salvage).toEqual([
      "repair",
      "recon",
      "discount",
    ]);
  });

  it("cannot be taken twice", () => {
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [],
      salvage: ["scrap", "repair", "recon"],
      draftNodeId: "n-1",
    });
    resolveSalvagePick("scrap");
    const after = useRunStore.getState().scrap;
    resolveSalvagePick("scrap");
    expect(useRunStore.getState().scrap).toBe(after);
  });
});

describe("salvage persistence", () => {
  beforeEach(() => {
    useNarrativeStore.getState().reset();
    useAppStore.getState().go("rewards");
    seatRun();
  });

  it("parks a stacked screen on the offer, so a pending pick survives a reload", () => {
    useRunStore.getState().setPendingRewards({
      dieDrop: null,
      perkChoices: [],
      salvage: ["scrap", "repair", "discount"],
      draftNodeId: "n-1",
    });
    for (const parked of ["journal", "codex", "settings", "bridge"] as const) {
      useAppStore.setState({ screen: parked });
      expect(captureRunSnapshot().screen).toBe("rewards");
    }

    useAppStore.setState({ screen: "journal" });
    const snapshot = captureRunSnapshot();
    useRunStore.getState().hydrate(createInitialRunValues());
    useAppStore.setState({ screen: "menu" });

    expect(restoreRunSnapshot(JSON.parse(JSON.stringify(snapshot)))).toBe(true);
    expect(useAppStore.getState().screen).toBe("rewards");
    expect(useRunStore.getState().pendingRewards?.salvage).toEqual([
      "scrap",
      "repair",
      "discount",
    ]);
  });

  it("still parks a stacked screen on the map with no pick waiting", () => {
    useRunStore.getState().setPendingRewards(null);
    for (const parked of ["journal", "codex", "settings", "bridge"] as const) {
      useAppStore.setState({ screen: parked });
      expect(captureRunSnapshot().screen).toBe("map");
    }
  });

  it("keeps an untaken offer and the reveal row across a reload", () => {
    useRunStore.getState().addSectorReveal(SALVAGE_RECON_ROWS);
    useRunStore.getState().setPendingRewards({
      dieDrop: "red-d6",
      perkChoices: [],
      salvage: ["scrap", "repair", "discount"],
      draftNodeId: "n-1",
    });
    const snapshot = captureRunSnapshot();
    useRunStore.getState().hydrate(createInitialRunValues());

    expect(restoreRunSnapshot(JSON.parse(JSON.stringify(snapshot)))).toBe(true);
    const after = useRunStore.getState();
    expect(after.pendingRewards?.salvage).toEqual([
      "scrap",
      "repair",
      "discount",
    ]);
    expect(after.pendingRewards?.dieDrop).toBe("red-d6");
    expect(after.sectorReveal).toBe(SALVAGE_RECON_ROWS);
  });

  it("carries a taken pick's empty offer, so the card does not come back", () => {
    useRunStore.getState().setPendingRewards({
      dieDrop: "red-d6",
      perkChoices: [],
      salvage: ["scrap", "repair", "discount"],
      draftNodeId: "n-1",
    });
    resolveSalvagePick("repair");
    const snapshot = captureRunSnapshot();
    useRunStore.getState().hydrate(createInitialRunValues());
    restoreRunSnapshot(JSON.parse(JSON.stringify(snapshot)));
    expect(useRunStore.getState().pendingRewards?.salvage).toEqual([]);
  });
});

describe("the reveal row is scoped to the act", () => {
  beforeEach(() => {
    abandonRun();
    useNarrativeStore.getState().reset();
  });

  it("survives a jump where the per-node reveal is wiped", () => {
    startRun(7);
    useRunStore.getState().addSectorReveal(SALVAGE_RECON_ROWS);
    useRunStore.getState().addBonusReveal(2);
    const map = useRunStore.getState().map;
    if (map === null) throw new Error("map missing");
    const first = outgoingEdges(map, START_NODE_ID)[0];
    if (first === undefined) throw new Error("no first node");
    expect(jumpTo(first)).toBe(true);
    expect(useRunStore.getState().bonusReveal).toBe(0);
    expect(useRunStore.getState().sectorReveal).toBe(SALVAGE_RECON_ROWS);
  });

  it("is cleared at the sector boundary", () => {
    startRun(7);
    useRunStore.getState().addSectorReveal(SALVAGE_RECON_ROWS);
    advanceSector();
    expect(useRunStore.getState().sectorReveal).toBe(0);
  });

  it("starts a fresh run at zero", () => {
    expect(createInitialRunValues().sectorReveal).toBe(0);
  });
});

const DRIFT_SEED = 1;

describe("a face that cannot pay is never offered", () => {
  beforeEach(() => {
    abandonRun();
    useNarrativeStore.getState().reset();
  });

  it("leaves the act-scoped faces out of the draw when they are excluded", () => {
    for (let seed = 1; seed <= 200; seed += 1) {
      const offer = rollSalvageOffer(
        seed,
        `gate-${String(seed)}`,
        ACT_SCOPED_FACES,
      );
      expect(offer).toHaveLength(SALVAGE_FACES.length - ACT_SCOPED_FACES.length);
      expect(new Set(offer).size).toBe(offer.length);
      for (const id of ACT_SCOPED_FACES) expect(offer).not.toContain(id);
    }
  });

  it("names exactly the faces the act boundary wipes", () => {
    startRun(7);
    useRunStore.getState().addSectorReveal(SALVAGE_RECON_ROWS);
    useRunStore.getState().addShipyardDiscount(SALVAGE_DISCOUNT_SCRAP);
    advanceSector();
    const after = useRunStore.getState();
    expect(after.sectorReveal).toBe(0);
    expect(after.shipyardDiscount).toBe(SALVAGE_DISCOUNT_SCRAP);
    expect(ACT_SCOPED_FACES).toEqual(["recon"]);
  });

  it("offers no reveal at the drift node that ends the act", () => {
    startRunMode({ mode: "drift", seed: DRIFT_SEED });
    const run = useRunStore.getState();
    const map = run.map;
    expect(map).not.toBeNull();
    if (map === null) return;
    const exit = map.nodes.find((node) =>
      isSectorExitRow(run.sectorIndex, node.row),
    );
    expect(exit).toBeDefined();
    if (exit === undefined) return;
    expect(isSalvageNode(exit.type)).toBe(true);
    expect(rollSalvageOffer(run.seed, exit.id)).toContain("recon");

    useRunStore.setState({ position: exit.id, depthRow: exit.row });
    useBattleStore.setState({ outcome: "victory", enemies: [], turn: 1 });
    resolveRunBattle();

    const offer = useRunStore.getState().pendingRewards?.salvage ?? [];
    expect(offer.length).toBeGreaterThan(0);
    for (const id of ACT_SCOPED_FACES) expect(offer).not.toContain(id);
  });

  it("still offers every face at a node the act carries on past", () => {
    startRunMode({ mode: "drift", seed: DRIFT_SEED });
    const run = useRunStore.getState();
    const map = run.map;
    expect(map).not.toBeNull();
    if (map === null) return;
    const inner = map.nodes.find(
      (node) =>
        isSalvageNode(node.type) && !isSectorExitRow(run.sectorIndex, node.row),
    );
    expect(inner).toBeDefined();
    if (inner === undefined) return;

    useRunStore.setState({ position: inner.id, depthRow: inner.row });
    useBattleStore.setState({ outcome: "victory", enemies: [], turn: 1 });
    resolveRunBattle();

    const offer = useRunStore.getState().pendingRewards?.salvage ?? [];
    expect(offer).toHaveLength(SALVAGE_OFFER_SIZE);
    expect(offer).toEqual(rollSalvageOffer(run.seed, inner.id));
  });
});
