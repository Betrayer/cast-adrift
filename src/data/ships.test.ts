import { describe, expect, it } from "vitest";
import {
  SHIPS,
  shipBridgeIssues,
  shipTextIssues,
  type ShipDef,
} from "@/data/ships";

const stub = (body: Partial<ShipDef>): ShipDef => ({
  id: "ram-proto",
  name: "content:ships.ram-proto.name",
  hullMax: 30,
  slots: {},
  bridgeTheme: { tint: "grey", frame: "raw", pins: {} },
  price: 0,
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

describe("bridge themes", () => {
  it("passes the shipped roster", () => {
    expect(shipBridgeIssues(SHIPS)).toEqual([]);
  });

  it("gives every hull a look of its own", () => {
    expect(new Set(SHIPS.map((s) => s.bridgeTheme.tint)).size).toBe(
      SHIPS.length,
    );
    expect(new Set(SHIPS.map((s) => s.bridgeTheme.frame)).size).toBe(
      SHIPS.length,
    );
  });

  it("fails a ship whose pin set does not match its hull", () => {
    const issues = shipBridgeIssues([
      stub({
        slots: { weaponA: { cap: 8, mk: 1 } },
        bridgeTheme: { tint: "grey", frame: "raw", pins: { engines: [0, 0] } },
      }),
    ]);
    expect(issues).toHaveLength(2);
    expect(issues.join(" ")).toContain("no bridge pin for slot");
    expect(issues.join(" ")).toContain("the hull does not carry");
  });

  it("fails two ships that share a look", () => {
    const theme = {
      tint: "grey",
      frame: "raw",
      pins: {},
    } as ShipDef["bridgeTheme"];
    const issues = shipBridgeIssues([
      stub({ id: "wanderer", bridgeTheme: theme }),
      stub({ id: "ram", bridgeTheme: theme }),
    ]);
    expect(issues).toHaveLength(2);
  });
});
