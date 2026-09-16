import { describe, expect, it } from "vitest";
import { cargoDef } from "@/data/cargo";
import { CABIN_CAP } from "@/data/officers";
import { generateSectorMap, START_NODE_ID } from "@/game/map/generator";
import { createStreams } from "@/services/rng";
import { nodeById } from "@/game/map/types";
import type { RunCargo } from "@/stores/runStore";
import { cabinRows, cargoRows, emptyHoldSlots } from "./bridgeRows";

const map = generateSectorMap(createStreams(11).map, 1);

describe("the cabins section model", () => {
  it("draws one row per cabin whatever the roster holds", () => {
    expect(cabinRows([])).toHaveLength(CABIN_CAP);
    expect(cabinRows(["mechanic"])).toHaveLength(CABIN_CAP);
    expect(cabinRows(["mechanic", "scrapper"])).toHaveLength(CABIN_CAP);
  });

  it("gives an aboard officer a row that carries the officer", () => {
    const rows = cabinRows(["mechanic"]);
    const first = rows[0];
    expect(first?.kind).toBe("officer");
    expect(first?.kind === "officer" ? first.def.id : null).toBe("mechanic");
    expect(first?.kind === "officer" ? first.def.short : null).toBe(
      "content:officers.mechanic.short",
    );
  });

  it("gives an empty cabin a row with no officer on it", () => {
    const rows = cabinRows(["mechanic"]);
    expect(rows[1]?.kind).toBe("empty");
    expect(rows.filter((row) => row.kind === "officer")).toHaveLength(1);
  });

  it("refuses to seat an id no officer answers to", () => {
    const rows = cabinRows(["nobody"]);
    expect(rows.every((row) => row.kind === "empty")).toBe(true);
  });
});

describe("the cargo section model", () => {
  const station = map.nodes.find((node) => node.type === "shop") ?? map.nodes[3];

  const entry = (defId: string): RunCargo => ({
    defId,
    nodeId: station?.id ?? START_NODE_ID,
    sectorIndex: 1,
    takenRow: 0,
  });

  it("states the rows left and the payout the delivery will actually pay", () => {
    const held = [entry("stasisPods")];
    const rows = cargoRows(held, map, 0, 1);
    const def = cargoDef("stasisPods");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.payout).toBe(def?.payout);
    expect(rows[0]?.rows).toBe(
      nodeById(map).get(station?.id ?? START_NODE_ID)?.row ?? 0,
    );
  });

  it("scales the stated payout by the act it is read in", () => {
    const held = [entry("stasisPods")];
    const plain = cargoRows(held, map, 0, 1)[0]?.payout ?? 0;
    const late = cargoRows(held, map, 0, 1.5)[0]?.payout ?? 0;
    expect(late).toBeGreaterThan(plain);
  });

  it("drops a hold entry no cargo answers to instead of drawing a blank row", () => {
    expect(cargoRows([entry("nothing")], map, 0, 1)).toHaveLength(0);
  });

  it("counts the empty hold slots left", () => {
    expect(emptyHoldSlots([], 1)).toBe(1);
    expect(emptyHoldSlots([entry("stasisPods")], 1)).toBe(0);
    expect(emptyHoldSlots([entry("stasisPods")], 2)).toBe(1);
  });
});
