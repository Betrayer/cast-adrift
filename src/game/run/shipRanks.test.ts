import { beforeEach, describe, expect, it } from "vitest";
import { MASTERY_RANK_XP, masteryRankOf, nextMasteryRankXp } from "@/data/shipMastery";
import { MK_COST } from "@/game/economy/prices";
import { SHIP_PERK_IDS, draftedPerks, masteryPerkIds } from "@/data/perks/ship";
import { openDraftRank, SHIP_RANK_XP, shipRankOf } from "@/data/shipRanks";
import { abandonRun, startRun } from "@/game/run/flow";
import { captureRunSnapshot, restoreRunSnapshot } from "@/game/run/snapshot";
import { noteShipEvent } from "@/game/run/shipProgress";
import { gainShipRankXp, pickShipPerk, rerollShipDraft } from "@/game/run/shipRanks";
import {
  firstMkDiscount,
  rollShipDraft,
  shipDraftRerollAllowed,
  shipDraftSize,
  shipPerkAvailable,
  rankXpCounts,
  type ShipDraftContext,
} from "@/game/run/shipRules";
import type { ShipId } from "@/data/ships";
import { draftContext } from "@/game/run/rewardPicks";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

const run = () => useRunStore.getState();

const draftCtx = (
  shipId: ShipId,
  over: Partial<ShipDraftContext> = {},
): ShipDraftContext => ({ shipId, mkLevels: {}, ascension: 0, disabledSlots: [], ...over });

describe("the rank tables", () => {
  it("reads mastery rank at each threshold and one below it", () => {
    for (const [rank, xp] of MASTERY_RANK_XP.entries()) {
      expect(masteryRankOf(xp)).toBe(rank);
      if (rank > 0) expect(masteryRankOf(xp - 1)).toBe(rank - 1);
    }
  });

  it("names the next mastery threshold and none past the top", () => {
    expect(nextMasteryRankXp(0)).toBe(60);
    expect(nextMasteryRankXp(320)).toBe(560);
    expect(nextMasteryRankXp(900)).toBeNull();
  });

  it("reads run rank at each threshold and one below it", () => {
    for (const [rank, xp] of SHIP_RANK_XP.entries()) {
      expect(shipRankOf(xp)).toBe(rank);
      if (rank > 0) expect(shipRankOf(xp - 1)).toBe(rank - 1);
    }
  });
});

describe("mastery rules", () => {
  it("pays the permanent perks by rank, skipping three and five", () => {
    expect(masteryPerkIds("ram", 0)).toEqual([]);
    expect(masteryPerkIds("ram", 2)).toEqual(["mastery-ram-1", "mastery-ram-2"]);
    expect(masteryPerkIds("ram", 5)).toEqual([
      "mastery-ram-1",
      "mastery-ram-2",
      "mastery-ram-4",
    ]);
  });

  it("gives the debug hull nothing", () => {
    expect(masteryPerkIds("ram-proto", 5)).toEqual([]);
    expect(firstMkDiscount("ram-proto", 5)).toBe(0);
  });

  it("keeps mastery perks out of the drafted list and ship perks in it", () => {
    expect(draftedPerks(["mastery-ram-1", "shipTurret", "emberHeart"])).toEqual([
      "shipTurret",
      "emberHeart",
    ]);
  });

  it("discounts the first Mk upgrade from rank three, by the ship's percent", () => {
    expect(firstMkDiscount("wanderer", 2)).toBe(0);
    expect(firstMkDiscount("wanderer", 3)).toBe(Math.round(MK_COST[2] * 0.2));
    expect(firstMkDiscount("ark", 5)).toBe(Math.round(MK_COST[2] * 0.24));
  });

  it("widens the draft at rank three and frees a redraw at rank five", () => {
    expect([0, 2, 3, 5].map(shipDraftSize)).toEqual([3, 3, 4, 4]);
    expect([4, 5].map(shipDraftRerollAllowed)).toEqual([false, true]);
  });
});

describe("the ship perk draft", () => {
  it("never offers a perk the ship has no slot for", () => {
    expect(shipPerkAvailable(draftCtx("corsair"), "shipCapacitor")).toBe(false);
    expect(shipPerkAvailable(draftCtx("ark"), "shipTargeting")).toBe(false);
    expect(shipPerkAvailable(draftCtx("wanderer"), "shipCapacitor")).toBe(true);
    expect(shipPerkAvailable(draftCtx("ark"), "shipBallast")).toBe(true);
  });

  it("never offers the targeting array once sensors are at their top Mk", () => {
    expect(shipPerkAvailable(draftCtx("wanderer"), "shipTargeting")).toBe(true);
    expect(shipPerkAvailable(draftCtx("wanderer", { mkLevels: { sensors: 3 } }), "shipTargeting")).toBe(false);
    expect(
      shipPerkAvailable(draftCtx("wanderer", { mkLevels: { sensors: 2 }, ascension: 13 }), "shipTargeting"),
    ).toBe(false);
    expect(
      shipPerkAvailable(draftCtx("wanderer", { mkLevels: { sensors: 2 }, ascension: 12 }), "shipTargeting"),
    ).toBe(true);
  });

  it("never offers a perk whose slot the contract disables", () => {
    expect(shipPerkAvailable(draftCtx("wanderer", { disabledSlots: ["sensors"] }), "shipTargeting")).toBe(false);
    expect(shipPerkAvailable(draftCtx("wanderer", { disabledSlots: ["shields"] }), "shipCapacitor")).toBe(false);
    expect(
      shipPerkAvailable(draftCtx("ark", { disabledSlots: ["shields"] }), "shipCapacitor"),
    ).toBe(true);
  });

  it("draws distinct cards, none already owned, the same for the same seed", () => {
    const owned = SHIP_PERK_IDS.slice(0, 4);
    const cards = rollShipDraft(draftCtx("wanderer"), owned, 4, 77);
    expect(new Set(cards).size).toBe(4);
    expect(cards.some((id) => owned.includes(id))).toBe(false);
    expect(rollShipDraft(draftCtx("wanderer"), owned, 4, 77)).toEqual(cards);
  });

  it("offers only what is left when the pool runs short", () => {
    const owned = SHIP_PERK_IDS.slice(0, SHIP_PERK_IDS.length - 2);
    expect(rollShipDraft(draftCtx("wanderer"), owned, 3, 5)).toHaveLength(2);
  });
});

describe("rank-ups in a run", () => {
  beforeEach(() => {
    abandonRun();
    useMetaStore.setState({ shipMastery: {} });
    startRun(11);
  });

  it("opens no draft below the first threshold", () => {
    gainShipRankXp(1);
    expect(run().pendingShipDraft).toEqual([]);
    expect(run().pendingRankUps).toBe(0);
  });

  it("opens a three-card draft at the first threshold", () => {
    gainShipRankXp(2);
    expect(run().pendingShipDraft).toHaveLength(3);
    expect(run().pendingRankUps).toBe(1);
  });

  it("installs the pick and closes the draft", () => {
    gainShipRankXp(2);
    const pick = run().pendingShipDraft[0] ?? "";
    pickShipPerk(pick);
    expect(run().perks).toContain(pick);
    expect(run().pendingShipDraft).toEqual([]);
    expect(run().pendingRankUps).toBe(0);
  });

  it("ignores a perk that was not offered", () => {
    gainShipRankXp(2);
    const offered = run().pendingShipDraft;
    const other = SHIP_PERK_IDS.find((id) => !offered.includes(id)) ?? "";
    pickShipPerk(other);
    expect(run().perks).not.toContain(other);
    expect(run().pendingShipDraft).toEqual(offered);
  });

  it("names each draft of a double rank-up by its own rank, through xp that stays under the next threshold", () => {
    gainShipRankXp(5);
    expect(openDraftRank(run().shipRankXp, run().pendingRankUps)).toBe(1);
    gainShipRankXp(1);
    expect(openDraftRank(run().shipRankXp, run().pendingRankUps)).toBe(1);
    pickShipPerk(run().pendingShipDraft[0] ?? "");
    expect(openDraftRank(run().shipRankXp, run().pendingRankUps)).toBe(2);
  });

  it("queues a second draft when two ranks arrive at once", () => {
    gainShipRankXp(5);
    expect(run().pendingRankUps).toBe(2);
    const first = run().pendingShipDraft[0] ?? "";
    pickShipPerk(first);
    expect(run().pendingRankUps).toBe(1);
    expect(run().pendingShipDraft).toHaveLength(3);
    expect(run().pendingShipDraft).not.toContain(first);
  });

  it("raises sensors one Mk when the targeting array is picked", () => {
    gainShipRankXp(2);
    useRunStore.setState({ pendingShipDraft: ["shipTargeting"] });
    const before = run().mkLevels.sensors ?? 1;
    const built = useMetaStore.getState().stats.mk3Built;
    pickShipPerk("shipTargeting");
    expect(run().mkLevels.sensors).toBe(before + 1);
    expect(useMetaStore.getState().stats.mk3Built).toBe(built);
  });

  it("counts the Mk3 the targeting array reaches, as a shipyard upgrade counts it", () => {
    gainShipRankXp(2);
    useRunStore.setState({
      pendingShipDraft: ["shipTargeting"],
      mkLevels: { ...run().mkLevels, sensors: 2 },
    });
    const built = useMetaStore.getState().stats.mk3Built;
    pickShipPerk("shipTargeting");
    expect(run().mkLevels.sensors).toBe(3);
    expect(useMetaStore.getState().stats.mk3Built).toBe(built + 1);
  });

  it("refuses the redraw below mastery five", () => {
    gainShipRankXp(2);
    const offered = run().pendingShipDraft;
    rerollShipDraft();
    expect(run().pendingShipDraft).toEqual(offered);
    expect(run().shipDraftRerollUsed).toBe(false);
  });

  it("redraws once at mastery five, to cards not offered before", () => {
    useRunStore.setState({ masteryRank: 5 });
    gainShipRankXp(2);
    const offered = run().pendingShipDraft;
    expect(offered).toHaveLength(4);
    rerollShipDraft();
    const redrawn = run().pendingShipDraft;
    expect(redrawn).toHaveLength(4);
    expect(redrawn.some((id) => offered.includes(id))).toBe(false);
    rerollShipDraft();
    expect(run().pendingShipDraft).toEqual(redrawn);
  });
});

describe("what earns ship progress", () => {
  beforeEach(() => {
    abandonRun();
    useMetaStore.setState({ shipMastery: {} });
    startRun(11);
    useRunStore.setState({ shipId: "wanderer", hull: 30, hullMax: 30 });
  });

  const masteryXp = (): number =>
    useMetaStore.getState().shipMastery.wanderer?.xp ?? 0;

  it("pays mastery and rank xp for an elite", () => {
    noteShipEvent("elite");
    expect(masteryXp()).toBe(6);
    expect(run().shipRankXp).toBe(2);
  });

  it("pays a mini-boss three rank xp and a boss five", () => {
    noteShipEvent("miniboss");
    expect(run().shipRankXp).toBe(3);
    noteShipEvent("boss");
    expect(run().shipRankXp).toBe(8);
    expect(masteryXp()).toBe(31);
  });

  it("pays rank xp for a cleared sector only at half hull or better", () => {
    useRunStore.setState({ hull: 15 });
    noteShipEvent("sectorCleared");
    expect(run().shipRankXp).toBe(2);
    useRunStore.setState({ hull: 14 });
    noteShipEvent("sectorCleared");
    expect(run().shipRankXp).toBe(2);
    expect(masteryXp()).toBe(40);
  });

  it("pays no rank xp for finishing the run or the campaign", () => {
    noteShipEvent("runEnded");
    noteShipEvent("campaignWon");
    expect(run().shipRankXp).toBe(0);
    expect(masteryXp()).toBe(65);
  });

  it("credits the ship in play, not the one equipped later", () => {
    useRunStore.setState({ shipId: "ram" });
    noteShipEvent("elite");
    expect(useMetaStore.getState().shipMastery.ram?.xp).toBe(6);
    expect(masteryXp()).toBe(0);
  });
});

describe("ship progress survives a reload", () => {
  beforeEach(() => {
    abandonRun();
    useMetaStore.setState({ shipMastery: {} });
    startRun(11);
  });

  it("restores rank xp, the open draft, the redraw and the spent box", () => {
    useRunStore.setState({ masteryRank: 5, blackBoxSpent: true });
    gainShipRankXp(5);
    rerollShipDraft();
    const before = run();
    const snapshot = captureRunSnapshot();
    abandonRun();
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    const after = run();
    expect(after.masteryRank).toBe(5);
    expect(after.shipRankXp).toBe(5);
    expect(after.pendingRankUps).toBe(before.pendingRankUps);
    expect(after.pendingShipDraft).toEqual(before.pendingShipDraft);
    expect(after.shipDraftRerollUsed).toBe(true);
    expect(after.blackBoxSpent).toBe(true);
  });

  it("starts the next run with no rank, no draft and an unspent box", () => {
    useRunStore.setState({ blackBoxSpent: true });
    gainShipRankXp(9);
    abandonRun();
    startRun(12);
    expect(run().shipRankXp).toBe(0);
    expect(run().pendingShipDraft).toEqual([]);
    expect(run().blackBoxSpent).toBe(false);
  });
});

describe("rank-ups in a run without perks", () => {
  beforeEach(() => {
    abandonRun();
    useMetaStore.setState({ shipMastery: {} });
    startRun(11);
  });

  it("earns no rank and opens no draft in a contract that bans perks", () => {
    useRunStore.setState({ contractId: "bareHull" });
    gainShipRankXp(5);
    expect(run().shipRankXp).toBe(0);
    expect(run().pendingShipDraft).toEqual([]);
  });

  it("says rank xp counted only while a rank is still to come", () => {
    expect(rankXpCounts(26, 0, false)).toBe(true);
    expect(rankXpCounts(27, 1, false)).toBe(true);
    expect(rankXpCounts(27, 0, false)).toBe(false);
    expect(rankXpCounts(3, 0, true)).toBe(false);
  });
});

describe("the ordinary perk draft", () => {
  beforeEach(() => {
    abandonRun();
    startRun(11);
  });

  it("sees only ordinary perks as owned, never mastery or ship perks", () => {
    useRunStore.setState({ perks: ["mastery-wanderer-1", "shipBallast", "emberHeart"] });
    expect(draftContext(run()).owned).toEqual(["emberHeart"]);
  });
});
