import { describe, expect, it } from "vitest";
import { SECTORS, sectorDef } from "@/data/sectors";
import { generateSectorMap } from "@/game/map/generator";
import {
  edgeKey,
  nodeById,
  type EdgeMark,
  type HoleSpot,
  type MapGraph,
  type MapNode,
  type NodeId,
  type WormholeEdge,
} from "@/game/map/types";
import { createStreams } from "@/services/rng";
import { mapGeometry, SIDE_MARGIN } from "./mapGeometry";
import {
  adjacentBypassOffer,
  bandHorizons,
  bypassCopyKey,
  bypassCopyVars,
  bypassOfferFor,
  bypassState,
  bypassTollMark,
  isDrawableEdge,
  sharesSpot,
  spotEllipse,
  spotEntryFor,
  spotMembers,
  SPOT_MIN_RADIUS,
} from "./spot";

const SPOT_ID = "spot:r2l1";

const node = (
  row: number,
  lane: number,
  extra: Partial<MapNode> = {},
): MapNode => ({
  id: `r${String(row)}l${String(lane)}`,
  row,
  lane,
  type: "battle",
  ...extra,
});

const swallowed = (row: number, lane: number): MapNode =>
  node(row, lane, { hole: true, spot: SPOT_ID });

const SHAPE = { bossRow: 5, gateRow: 2, lanes: 3 };

const geo = mapGeometry(SHAPE);

const spotOf = (nodes: readonly MapNode[]): HoleSpot => ({
  id: SPOT_ID,
  nodes: nodes.map((n) => n.id),
  rows: [
    Math.min(...nodes.map((n) => n.row)),
    Math.max(...nodes.map((n) => n.row)),
  ],
  lanes: [
    Math.min(...nodes.map((n) => n.lane)),
    Math.max(...nodes.map((n) => n.lane)),
  ],
});

const inside = (
  ellipse: { cx: number; cy: number; rx: number; ry: number },
  x: number,
  y: number,
): boolean =>
  ((x - ellipse.cx) / ellipse.rx) ** 2 + ((y - ellipse.cy) / ellipse.ry) ** 2 <=
  1.0001;

describe("the spot ellipse", () => {
  it("covers every corner of every member node's rect", () => {
    const members = [swallowed(2, 0), swallowed(2, 1), swallowed(3, 1)];
    const ellipse = spotEllipse(geo, members);
    expect(ellipse).not.toBeNull();
    if (ellipse === null) return;
    for (const member of members) {
      const r = geo.radius(member);
      const x = geo.nodeX(member);
      const y = geo.nodeY(member);
      for (const dx of [-r, r]) {
        for (const dy of [-r, r]) {
          expect(
            inside(ellipse, x + dx, y + dy),
            `${member.id} corner ${String(dx)},${String(dy)}`,
          ).toBe(true);
        }
      }
    }
  });

  it("centres on the bounding box of the member rects", () => {
    const members = [swallowed(2, 0), swallowed(4, 2)];
    const ellipse = spotEllipse(geo, members);
    expect(ellipse?.cx).toBe((geo.laneX(0) + geo.laneX(2)) / 2);
    expect(ellipse?.cy).toBe((geo.rowY(2) + geo.rowY(4)) / 2);
  });

  it("grows with the cluster and never shrinks below the floor", () => {
    const one = spotEllipse(geo, [swallowed(2, 1)]);
    const three = spotEllipse(geo, [
      swallowed(2, 0),
      swallowed(2, 1),
      swallowed(3, 1),
    ]);
    expect(one?.rx ?? 0).toBeGreaterThanOrEqual(SPOT_MIN_RADIUS);
    expect(one?.ry ?? 0).toBeGreaterThanOrEqual(SPOT_MIN_RADIUS);
    expect(three?.rx ?? 0).toBeGreaterThan(one?.rx ?? 0);
    expect(three?.ry ?? 0).toBeGreaterThan(one?.ry ?? 0);
  });

  it("has nothing to draw when the fog hides every member", () => {
    expect(spotEllipse(geo, [])).toBeNull();
  });

  it("keeps only the members the fog has lifted from", () => {
    const members = [swallowed(2, 1), swallowed(3, 1)];
    const byId = new Map(members.map((n) => [n.id, n]));
    const visible = new Set<NodeId>(["r2l1"]);
    expect(spotMembers(spotOf(members), byId, visible)).toEqual([members[0]]);
  });
});

describe("edges inside a spot", () => {
  const all = new Set<NodeId>(["r2l0", "r2l1", "r3l1"]);

  it("are not drawn", () => {
    expect(sharesSpot(swallowed(2, 1), swallowed(3, 1))).toBe(true);
    expect(isDrawableEdge(swallowed(2, 1), swallowed(3, 1), all)).toBe(false);
  });

  it("still draw the edge that enters the spot from a live node", () => {
    expect(sharesSpot(node(2, 0), swallowed(3, 1))).toBe(false);
    expect(isDrawableEdge(node(2, 0), swallowed(3, 1), all)).toBe(true);
  });

  it("stay hidden while either endpoint is under the fog", () => {
    expect(isDrawableEdge(node(2, 0), node(3, 1), new Set(["r2l0"]))).toBe(
      false,
    );
  });
});

const RIM_SPOT = "spot:rim";
const RIM_LANES = 3;
const RIM_ROW = 1;
const RIM_BAND: readonly [number, number] = [2, 3];
const RIM_BOSS = 5;

const inRimBand = (row: number): boolean =>
  row >= RIM_BAND[0] && row <= RIM_BAND[1];

const rimNodes: MapNode[] = [
  node(0, 1, { type: "start" }),
  ...Array.from({ length: (RIM_BOSS - 1) * RIM_LANES }, (_, i) => {
    const row = Math.floor(i / RIM_LANES) + 1;
    const lane = i % RIM_LANES;
    return node(row, lane, inRimBand(row) ? { hole: true, spot: RIM_SPOT } : {});
  }),
  node(RIM_BOSS, 1, { type: "boss" }),
];

const rimEdges: [NodeId, NodeId][] = rimNodes.flatMap((from) =>
  rimNodes
    .filter(
      (to) =>
        to.row === from.row + 1 &&
        (from.type === "start" ||
          to.type === "boss" ||
          Math.abs(to.lane - from.lane) <= 1),
    )
    .map((to): [NodeId, NodeId] => [from.id, to.id]),
);

const rimSpot: HoleSpot = {
  id: RIM_SPOT,
  nodes: rimNodes.filter((n) => n.hole === true).map((n) => n.id),
  rows: RIM_BAND,
  lanes: [0, RIM_LANES - 1],
};

const farRimOf = (lane: number): NodeId =>
  `r${String(RIM_BAND[1] + 1)}l${String(lane)}`;

const rimRecords = (): Record<string, WormholeEdge> => {
  const byId = new Map(rimNodes.map((n) => [n.id, n]));
  const out: Record<string, WormholeEdge> = {};
  for (const [from, to] of rimEdges) {
    const source = byId.get(from);
    if (source === undefined || source.row !== RIM_ROW) continue;
    if (byId.get(to)?.hole !== true) continue;
    out[edgeKey(from, to)] = { from, hole: to, bypass: farRimOf(source.lane) };
  }
  return out;
};

const rimMap = (overrides: Partial<MapGraph> = {}): MapGraph => {
  const wormholes = rimRecords();
  return {
    nodes: rimNodes,
    edges: rimEdges,
    shape: { bossRow: RIM_BOSS, gateRow: 0, lanes: RIM_LANES },
    edgeMarks: Object.fromEntries(
      Object.keys(wormholes).map((key): [string, EdgeMark] => [key, "wormhole"]),
    ),
    wormholes,
    spots: [rimSpot],
    bossReach: rimNodes.filter((n) => n.hole !== true).map((n) => n.id),
    ...overrides,
  };
};

const FAR_RIM: readonly NodeId[] = [farRimOf(0), farRimOf(1), farRimOf(2)];

describe("the spot as one click target", () => {
  it("routes to the entry straight ahead of the ship", () => {
    for (let lane = 0; lane < RIM_LANES; lane += 1) {
      expect(spotEntryFor(rimMap(), `r1l${String(lane)}`, rimSpot, [])).toBe(
        `r2l${String(lane)}`,
      );
    }
  });

  it("offers nothing from a node with no wormhole edge into the spot", () => {
    expect(spotEntryFor(rimMap(), "r0l1", rimSpot, [])).toBeNull();
    expect(spotEntryFor(rimMap(), "r4l1", rimSpot, [])).toBeNull();
  });

  it("picks the entry nearest the ship's lane, the lower id on a tie", () => {
    expect(spotEntryFor(rimMap(), "r1l1", rimSpot, ["r2l1"])).toBe("r2l0");
    expect(spotEntryFor(rimMap(), "r1l1", rimSpot, ["r2l1", "r2l0"])).toBe(
      "r2l2",
    );
    expect(spotEntryFor(rimMap(), "r1l0", rimSpot, ["r2l0"])).toBe("r2l1");
    expect(spotEntryFor(rimMap(), "r1l0", rimSpot, ["r2l0", "r2l1"])).toBeNull();
  });
});

const bypassPctOf = (sector: number): number => {
  const motif = sectorDef(sector).shape.motifs.find((m) => m.m === "blackHoles");
  return motif?.m === "blackHoles" ? motif.bypassPct : 0;
};

const HOLE_SECTORS: readonly number[] = [2, 3, 4, 5, 6];

describe("the bypass offer the card and the preview both read", () => {
  it("charges the ceiling of the sector's share of max hull", () => {
    for (const sector of HOLE_SECTORS) {
      const pct = bypassPctOf(sector);
      expect(pct, `S${String(sector)}`).toBeGreaterThan(0);
      for (const hullMax of [7, 10, 23, 30, 41, 60]) {
        const offer = bypassOfferFor(
          rimMap(),
          "r1l1",
          "r2l1",
          [],
          sector,
          hullMax,
          hullMax,
        );
        const label = `S${String(sector)} max ${String(hullMax)}`;
        expect(offer.offered, label).toBe(true);
        expect(offer.toll, label).toBe(Math.ceil(hullMax * pct));
        expect(offer.pct, label).toBe(Math.round(pct * 100));
        expect(offer.lethal, label).toBe(false);
        expect(bypassCopyKey(offer), label).toBe("run:hole.bypassCost");
      }
    }
  });

  it("prices the toll off max hull, not the hull the ship has left", () => {
    const full = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 6, 30, 30);
    const worn = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 6, 12, 30);
    expect(worn.toll).toBe(full.toll);
    expect(worn.lethal).toBe(false);
    const bare = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 6, 12);
    expect(bare.toll).toBe(Math.ceil(12 * bypassPctOf(6)));
  });

  it("turns lethal once the hull is at or under the toll", () => {
    for (const sector of HOLE_SECTORS) {
      const toll = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], sector, 30, 30)
        .toll;
      for (const hull of [1, toll - 1, toll]) {
        const offer = bypassOfferFor(
          rimMap(),
          "r1l1",
          "r2l1",
          [],
          sector,
          hull,
          30,
        );
        const label = `S${String(sector)} hull ${String(hull)}`;
        expect(offer.offered, label).toBe(true);
        expect(offer.lethal, label).toBe(true);
        expect(offer.toll, label).toBe(toll);
        expect(bypassCopyKey(offer), label).toBe("run:hole.bypassLethal");
      }
      const safe = bypassOfferFor(
        rimMap(),
        "r1l1",
        "r2l1",
        [],
        sector,
        toll + 1,
        30,
      );
      expect(safe.lethal, `S${String(sector)}`).toBe(false);
      expect(bypassCopyKey(safe)).toBe("run:hole.bypassCost");
    }
  });

  it("disables the control when every far-rim node is already behind", () => {
    const offer = bypassOfferFor(rimMap(), "r1l1", "r2l1", FAR_RIM, 4, 1, 30);
    expect(offer.offered).toBe(false);
    expect(offer.lethal).toBe(false);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassNone");
  });

  it("still offers the bypass while one far-rim node is open", () => {
    const offer = bypassOfferFor(
      rimMap(),
      "r1l1",
      "r2l1",
      FAR_RIM.filter((id) => id !== farRimOf(2)),
      4,
      30,
    );
    expect(offer.offered).toBe(true);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassCost");
  });

  it("disables the control on an edge that is not a wormhole at all", () => {
    const offer = bypassOfferFor(rimMap(), "r0l1", "r1l1", [], 4, 30);
    expect(offer.offered).toBe(false);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassNone");
  });

  it("charges nothing where the sector declares no hole", () => {
    const offer = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 1, 1, 30);
    expect(offer.toll).toBe(0);
    expect(offer.pct).toBe(0);
    expect(offer.lethal).toBe(false);
  });

  it("gives the card and the preview one verdict, one toll mark and one set of copy values", () => {
    const none = bypassOfferFor(rimMap(), "r1l1", "r2l1", FAR_RIM, 4, 1, 30);
    expect(bypassState(none)).toBe("none");
    expect(bypassTollMark(none)).toBe("-1");
    const cost = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 4, 30, 30);
    expect(bypassState(cost)).toBe("cost");
    expect(bypassTollMark(cost)).toBe(String(cost.toll));
    expect(bypassCopyVars(cost)).toEqual({ n: cost.toll, pct: cost.pct });
    const lethal = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 4, cost.toll, 30);
    expect(bypassState(lethal)).toBe("lethal");
    expect(bypassTollMark(lethal)).toBe(String(cost.toll));
  });
});

const rimHole = node(RIM_BAND[0], 1, { hole: true, spot: RIM_SPOT });

describe("the verdict the preview card is allowed to state", () => {
  it("reads the offer for a hole on an edge out of the node the ship stands on", () => {
    const offer = adjacentBypassOffer(rimMap(), "r1l1", rimHole, [], 4, 30);
    expect(offer).not.toBeNull();
    if (offer === null) return;
    expect(offer.offered).toBe(true);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassCost");
  });

  it("carries the lethal verdict to the preview", () => {
    const toll = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 4, 30).toll;
    const offer = adjacentBypassOffer(rimMap(), "r1l1", rimHole, [], 4, toll, 30);
    expect(offer?.lethal).toBe(true);
    expect(offer === null ? null : bypassCopyKey(offer)).toBe(
      "run:hole.bypassLethal",
    );
  });

  it("refuses one for a hole the ghost row shows but the ship cannot act on", () => {
    expect(adjacentBypassOffer(rimMap(), "r0l1", rimHole, [], 4, 30)).toBeNull();
  });

  it("keeps the ghost preview from asserting the opposite of one jump later", () => {
    const far = bypassOfferFor(rimMap(), "r0l1", "r2l1", [], 4, 30);
    const near = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 4, 30);
    expect(bypassCopyKey(far)).toBe("run:hole.bypassNone");
    expect(bypassCopyKey(near)).toBe("run:hole.bypassCost");
    expect(adjacentBypassOffer(rimMap(), "r0l1", rimHole, [], 4, 30)).toBeNull();
  });

  it("has no verdict for a node the band never swallowed", () => {
    expect(
      adjacentBypassOffer(rimMap(), "r0l1", node(1, 0), [], 4, 30),
    ).toBeNull();
  });
});

const SWEEP_SEEDS = 48;

const litUnderFog = (members: readonly MapNode[]): MapNode[][] => {
  const rows = [...new Set(members.map((n) => n.row))].sort((a, b) => a - b);
  const lanes = [...new Set(members.map((n) => n.lane))].sort((a, b) => a - b);
  const out: MapNode[][] = [];
  for (const row of rows) {
    const below = members.filter((n) => n.row < row);
    for (const lane of lanes) {
      out.push([
        ...below,
        ...members.filter((n) => n.row === row && n.lane <= lane),
      ]);
      out.push(members.filter((n) => n.row === row && n.lane >= lane));
    }
  }
  return out;
};

describe("the disc the stage has to hold", () => {
  it("clamps a full-width band inside the viewBox", () => {
    const shape = { bossRow: 20, gateRow: 10, lanes: 4 };
    const wide = mapGeometry(shape);
    const band: MapNode[] = [];
    for (const row of [12, 13, 14]) {
      for (let lane = 0; lane < shape.lanes; lane += 1) {
        band.push(swallowed(row, lane));
      }
    }
    const ellipse = spotEllipse(wide, band);
    expect(ellipse).not.toBeNull();
    if (ellipse === null) return;
    expect(ellipse.cx - ellipse.rx).toBeGreaterThanOrEqual(0);
    expect(ellipse.cx + ellipse.rx).toBeLessThanOrEqual(wide.viewW);
    expect(ellipse.rx).toBeGreaterThanOrEqual(
      (wide.laneX(shape.lanes - 1) - wide.laneX(0)) / 2,
    );
  });

  it("stays inside the viewBox for every band the generator draws, under any fog line", () => {
    let checked = 0;
    for (const sector of SECTORS) {
      for (let seed = 1; seed <= SWEEP_SEEDS; seed += 1) {
        const map = generateSectorMap(createStreams(seed).map, sector.id);
        if (map.spots.length === 0) continue;
        const geo = mapGeometry(map.shape);
        const byId = nodeById(map);
        for (const spot of map.spots) {
          const members = spot.nodes
            .map((id) => byId.get(id))
            .filter((node): node is MapNode => node !== undefined);
          for (const lit of [members, ...litUnderFog(members)]) {
            if (lit.length === 0) continue;
            const ellipse = spotEllipse(geo, lit);
            expect(ellipse).not.toBeNull();
            if (ellipse === null) continue;
            checked += 1;
            const where = `s${String(sector.id)} seed ${String(seed)} ${spot.id} [${lit
              .map((node) => node.id)
              .join(" ")}]`;
            expect(ellipse.cx - ellipse.rx, `${where} left`).toBeGreaterThanOrEqual(0);
            expect(ellipse.cx + ellipse.rx, `${where} right`).toBeLessThanOrEqual(
              geo.viewW,
            );
            expect(ellipse.cy - ellipse.ry, `${where} top`).toBeGreaterThanOrEqual(0);
            expect(ellipse.cy + ellipse.ry, `${where} bottom`).toBeLessThanOrEqual(
              geo.viewH,
            );
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("the band's horizon lines", () => {
  const shape = { bossRow: 20, gateRow: 10, lanes: 4 };
  const wide = mapGeometry(shape);
  const band: HoleSpot = {
    id: "spot:band",
    nodes: [],
    rows: [12, 14],
    lanes: [0, shape.lanes - 1],
  };

  it("draws the near rim between the rim row and the band's first row", () => {
    const [near] = bandHorizons(wide, band, shape.lanes, band.rows[0]);
    expect(near?.side).toBe("near");
    expect(near?.y).toBe((wide.rowY(band.rows[0]) + wide.rowY(band.rows[0] - 1)) / 2);
  });

  it("adds the far rim once the fog has lifted off the band's last row", () => {
    expect(bandHorizons(wide, band, shape.lanes, band.rows[1] - 1)).toHaveLength(1);
    const lines = bandHorizons(wide, band, shape.lanes, band.rows[1]);
    expect(lines.map((line) => line.side)).toEqual(["near", "far"]);
    const far = lines[1];
    expect(far?.y).toBe((wide.rowY(band.rows[1]) + wide.rowY(band.rows[1] + 1)) / 2);
    expect(far?.y ?? 0).toBeLessThan(lines[0]?.y ?? 0);
    expect(bandHorizons(wide, band, shape.lanes, shape.bossRow)).toEqual(lines);
  });

  it("spans every lane and stays inside the viewBox", () => {
    for (const line of bandHorizons(wide, band, shape.lanes, shape.bossRow)) {
      expect(line.x1).toBe(wide.laneX(0) - SIDE_MARGIN / 2);
      expect(line.x2).toBe(wide.laneX(shape.lanes - 1) + SIDE_MARGIN / 2);
      expect(line.x1).toBeGreaterThanOrEqual(0);
      expect(line.x2).toBeLessThanOrEqual(wide.viewW);
    }
  });

  it("draws nothing for a spot that does not span the map", () => {
    const blob: HoleSpot = { ...band, lanes: [1, 2] };
    expect(bandHorizons(wide, blob, shape.lanes, shape.bossRow)).toEqual([]);
    expect(bandHorizons(wide, band, shape.lanes + 1, shape.bossRow)).toEqual([]);
  });

  it("draws both rims for every band the generator carves", () => {
    for (const sector of SECTORS) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const map = generateSectorMap(createStreams(seed).map, sector.id);
        const geo = mapGeometry(map.shape);
        for (const spot of map.spots) {
          const lines = bandHorizons(geo, spot, map.shape.lanes, map.shape.bossRow);
          expect(lines, `s${String(sector.id)} seed ${String(seed)}`).toHaveLength(2);
        }
      }
    }
  });
});
