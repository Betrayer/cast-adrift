import { describe, expect, it } from "vitest";
import { SHIPS, shipTextIssues, type ShipDef } from "@/data/ships";

const stub = (body: Partial<ShipDef>): ShipDef => ({
  id: "ram-proto",
  name: "content:ships.ram-proto.name",
  hullMax: 30,
  slots: {},
  price: 0,
  unlockLevel: 1,
  ...body,
});

describe("ship text", () => {
  it("passes the shipped roster", () => {
    expect(shipTextIssues(SHIPS)).toEqual([]);
  });

  it("fails a ship whose passive has no authored text", () => {
    const issues = shipTextIssues([
      stub({ passive: { kind: "scrapper", scrap: 2 } }),
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toContain("scrapper");
  });

  it("fails a ship that names its passive but never describes it", () => {
    const issues = shipTextIssues([
      stub({
        passive: { kind: "bulwark", keepPct: 25 },
        passiveName: "content:ships.ark.passiveName",
      }),
    ]);
    expect(issues).toHaveLength(1);
  });

  it("lets a passive-less ship through", () => {
    expect(shipTextIssues([stub({})])).toEqual([]);
  });
});
