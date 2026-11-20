import { describe, expect, it } from "vitest";
import { CAMPAIGN_SECTORS, SECTORS } from "@/data/sectors";
import { CONTRACTS } from "@/data/contracts";
import { routePipState, summaryRoute, type RouteSource } from "./SectorLadder";

const campaign = (sectorIndex: number, crossedThreshold = false): RouteSource => ({
  sectorIndex,
  crossedThreshold,
  mode: "campaign",
  contractId: null,
});

const states = (source: RouteSource, win: boolean): string[] => {
  const route = summaryRoute(source, win);
  return Array.from({ length: route.total }, (_, index) =>
    routePipState(route, index + 1),
  );
};

describe("summary sector ladder", () => {
  it("draws one pip per campaign sector and ends a loss on the sector it died in", () => {
    expect(summaryRoute(campaign(3), false)).toEqual({
      total: CAMPAIGN_SECTORS,
      from: 1,
      to: 3,
      win: false,
    });
    expect(states(campaign(3), false)).toEqual([
      "cleared",
      "cleared",
      "ended",
      "open",
      "open",
    ]);
  });

  it("clears every pip on a campaign win", () => {
    expect(states(campaign(CAMPAIGN_SECTORS), true)).toEqual(
      Array.from({ length: CAMPAIGN_SECTORS }, () => "cleared"),
    );
  });

  it("adds the sixth act only when the run crossed the threshold", () => {
    expect(summaryRoute(campaign(CAMPAIGN_SECTORS), true).total).toBe(
      CAMPAIGN_SECTORS,
    );
    const beyond = summaryRoute(campaign(SECTORS.length, true), true);
    expect(beyond.total).toBe(SECTORS.length);
    expect(beyond.to).toBe(SECTORS.length);
  });

  it("starts a contract's route on the contract's sector", () => {
    const contract = CONTRACTS.find((def) => (def.setup.sector ?? 1) > 1);
    expect(contract).toBeDefined();
    if (contract === undefined) return;
    const start = contract.setup.sector ?? 1;
    const source: RouteSource = {
      sectorIndex: start,
      crossedThreshold: false,
      mode: "contract",
      contractId: contract.id,
    };
    const route = summaryRoute(source, true);
    expect(route.from).toBe(start);
    expect(route.to).toBe(start);
    expect(routePipState(route, 1)).toBe("open");
    expect(routePipState(route, start)).toBe("cleared");
  });

  it("clamps a sector index outside the ladder", () => {
    expect(summaryRoute(campaign(0), false).to).toBe(1);
    expect(summaryRoute(campaign(SECTORS.length + 3), true).to).toBe(
      CAMPAIGN_SECTORS,
    );
  });
});
