import { describe, expect, it } from "vitest";
import { SECTORS } from "@/data/sectors";
import { generateSectorMap } from "@/game/map/generator";
import {
  edgeKey,
  nodeById,
  type HoleSpot,
  type MapGraph,
  type MapNode,
  type NodeId,
} from "@/game/map/types";
import { createStreams } from "@/services/rng";
import { mapGeometry } from "./mapGeometry";
import {
  bypassCopyKey,
  bypassOfferFor,
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

const rimNodes: MapNode[] = [
  node(0, 1, { type: "start" }),
  node(1, 0),
  node(1, 1),
  node(2, 0),
  node(2, 1, { hole: true, spot: RIM_SPOT }),
  node(2, 2),
  node(3, 1, { hole: true, spot: RIM_SPOT }),
  node(3, 0),
  node(3, 2),
  node(4, 1, { type: "boss" }),
];

const rimEdges: [NodeId, NodeId][] = [
  ["r0l1", "r1l0"],
  ["r0l1", "r1l1"],
  ["r1l0", "r2l0"],
  ["r1l1", "r2l0"],
  ["r1l1", "r2l1"],
  ["r2l0", "r3l0"],
  ["r2l1", "r3l1"],
  ["r2l2", "r3l2"],
  ["r3l0", "r4l1"],
  ["r3l1", "r4l1"],
  ["r3l2", "r4l1"],
];

const rimSpot: HoleSpot = {
  id: RIM_SPOT,
  nodes: ["r2l1", "r3l1"],
  rows: [2, 3],
  lanes: [1, 1],
};

const rimMap = (overrides: Partial<MapGraph> = {}): MapGraph => ({
  nodes: rimNodes,
  edges: rimEdges,
  shape: { bossRow: 4, gateRow: 1, lanes: 3 },
  edgeMarks: { [edgeKey("r1l1", "r2l1")]: "wormhole" },
  wormholes: {
    [edgeKey("r1l1", "r2l1")]: { from: "r1l1", hole: "r2l1", bypass: "r2l2" },
  },
  spots: [rimSpot],
  bossReach: rimNodes.filter((n) => n.hole !== true).map((n) => n.id),
  ...overrides,
});

describe("the spot as one click target", () => {
  it("routes to the entry node the player actually stands on", () => {
    expect(spotEntryFor(rimMap(), "r1l1", rimSpot, [])).toBe("r2l1");
  });

  it("offers nothing from a node with no wormhole edge into the spot", () => {
    expect(spotEntryFor(rimMap(), "r1l0", rimSpot, [])).toBeNull();
  });

  it("prefers the entry whose bypass is a lateral slip", () => {
    const twoWay = rimMap({
      edges: [...rimEdges, ["r1l1", "r3l1"]],
      edgeMarks: {
        [edgeKey("r1l1", "r2l1")]: "wormhole",
        [edgeKey("r1l1", "r3l1")]: "wormhole",
      },
      wormholes: {
        [edgeKey("r1l1", "r2l1")]: {
          from: "r1l1",
          hole: "r2l1",
          bypass: "r2l0",
        },
        [edgeKey("r1l1", "r3l1")]: {
          from: "r1l1",
          hole: "r3l1",
          bypass: "r3l2",
        },
      },
    });
    expect(spotEntryFor(twoWay, "r1l1", rimSpot, [])).toBe("r3l1");
  });
});

const walkable = rimMap({
  wormholes: {
    [edgeKey("r1l1", "r2l1")]: { from: "r1l1", hole: "r2l1", bypass: "r2l0" },
  },
});

describe("the bypass offer the card and the preview both read", () => {
  it("charges the sector toll when the bypass buys a lateral slip", () => {
    const offer = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 4, 20);
    expect(offer.offered).toBe(true);
    expect(offer.waived).toBe(false);
    expect(offer.toll).toBe(2);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassCost");
  });

  it("waives the toll when the bypass only walks an edge already offered", () => {
    const offer = bypassOfferFor(walkable, "r1l1", "r2l1", [], 4, 20);
    expect(offer.offered).toBe(true);
    expect(offer.waived).toBe(true);
    expect(offer.toll).toBe(0);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassDrift");
  });

  it("says free rather than waived when the hull cannot pay", () => {
    const offer = bypassOfferFor(rimMap(), "r1l1", "r2l1", [], 4, 2);
    expect(offer.waived).toBe(false);
    expect(offer.toll).toBe(0);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassFree");
  });

  it("disables the control when every legal target is already behind", () => {
    const offer = bypassOfferFor(
      rimMap(),
      "r1l1",
      "r2l1",
      ["r2l0", "r2l2"],
      4,
      20,
    );
    expect(offer.offered).toBe(false);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassNone");
  });

  it("disables the control on an edge that is not a wormhole at all", () => {
    const offer = bypassOfferFor(rimMap(), "r1l1", "r2l0", [], 4, 20);
    expect(offer.offered).toBe(false);
    expect(bypassCopyKey(offer)).toBe("run:hole.bypassNone");
  });
});

const SWEEP_SEEDS = 48;

const subsetsOf = <T,>(items: readonly T[]): T[][] => {
  const out: T[][] = [];
  for (let mask = 1; mask < 1 << items.length; mask += 1) {
    out.push(items.filter((_, i) => (mask & (1 << i)) !== 0));
  }
  return out;
};

describe("the disc the stage has to hold", () => {
  it("stays inside the viewBox for every spot the generator draws, under any fog", () => {
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
          for (const lit of subsetsOf(members)) {
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
