import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { schools } from "@/data/schools";
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
  cargoHold: 1,
  slots: {},
  bridgeTheme: { tint: "grey", frame: "raw" },
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

  it("fails two ships that share a look", () => {
    const theme = {
      tint: "grey",
      frame: "raw",
    } as ShipDef["bridgeTheme"];
    const issues = shipBridgeIssues([
      stub({ id: "wanderer", bridgeTheme: theme }),
      stub({ id: "ram", bridgeTheme: theme }),
    ]);
    expect(issues).toHaveLength(2);
  });
});

describe("the landing parade", () => {
  it("draws every parade hull in its ship's in-game tint", () => {
    const parade = SHIPS.filter((ship) => existsSync(new URL(`../../landing/ships/${ship.id}.svg`, import.meta.url)));
    expect(parade.map((ship) => ship.id).sort()).toEqual(["ark", "corsair", "foundry", "prism", "ram", "wanderer"]);
    for (const ship of parade) {
      const svg = readFileSync(new URL(`../../landing/ships/${ship.id}.svg`, import.meta.url), "utf8");
      const strokes = new Set([...svg.matchAll(/stroke="(#[0-9A-Fa-f]{6})"/g)].map((m) => (m[1] ?? "").toUpperCase()));
      expect({ ship: ship.id, strokes: [...strokes] }).toEqual({
        ship: ship.id,
        strokes: [schools[ship.bridgeTheme.tint].stroke.toUpperCase()],
      });
    }
  });
});
