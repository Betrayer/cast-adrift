import type { LocKey, School } from "@/types/content";
import { mapEffectMagnitudes, mapModValues } from "@/data/chart/scale";
import { smallTier } from "@/data/chart/types";
import type { ChartRequirement, ChartScaling } from "@/data/chart/types";
import type { ChartNodeDef } from "@/data/chart/types";
import {
  CONFLUENCE,
  GATE_CONTENT,
  HUB_NOTABLES,
  HUB_SMALLS,
  KEYSTONES,
  MINORS,
  NEXUS,
  NOTABLES,
  SMALL_POOLS,
  type Content,
} from "@/data/chart/pools";
import { SCHOOL_ORDER } from "@/data/schools";

const namedContent = (n: Content): Content => ({
  effects: n.effects,
  mods: n.mods,
  traits: n.traits,
  tags: n.tags,
  fx: n.fx,
  budgetDelta: n.budgetDelta,
  slotTierDelta: n.slotTierDelta,
});

const CONFLUENCE_PER = 5;
const CONFLUENCE_MAX = 25;

const partnerOf = (school: School, step: -1 | 1): School => {
  const index = SCHOOL_ORDER.indexOf(school);
  const size = SCHOOL_ORDER.length;
  return SCHOOL_ORDER[(index + step + size) % size] ?? school;
};

const confluenceScaling = (school: School, index: 0 | 1): ChartScaling => ({
  school: partnerOf(school, index === 0 ? -1 : 1),
  per: CONFLUENCE_PER,
  max: CONFLUENCE_MAX,
});

const NEXUS_POINTS_REQUIRED = 12;

const nexusId = (between: readonly [School, School]): string =>
  `nexus-${between[0]}-${between[1]}`;

const nexusRequirement = (
  between: readonly [School, School],
): ChartRequirement => {
  const pointsIn: Partial<Record<School, number>> = {};
  pointsIn[between[0]] = NEXUS_POINTS_REQUIRED;
  pointsIn[between[1]] = NEXUS_POINTS_REQUIRED;
  return { pointsIn };
};

const TIER_MULT: readonly number[] = [1, 1.5, 2.25, 3];

const scaleNumber = (base: number, tier: number): number => {
  if (tier <= 1) return base;
  const mult = TIER_MULT[tier - 1] ?? 1;
  const size = Math.abs(base);
  const grown = Math.max(size + tier - 1, Math.round(size * mult));
  return base < 0 ? -grown : grown;
};

const scaleContent = (content: Content, tier: number): Content => {
  const grow = (n: number): number => scaleNumber(n, tier);
  return {
    ...content,
    ...(content.mods === undefined
      ? {}
      : { mods: mapModValues(content.mods, grow) }),
    ...(content.effects === undefined
      ? {}
      : { effects: content.effects.map((e) => mapEffectMagnitudes(e, grow)) }),
  };
};

const payloadKey = (content: Content): string =>
  JSON.stringify([
    content.mods ?? null,
    content.effects ?? null,
    content.traits ?? null,
    content.fx ?? null,
  ]);

const basePool = (school: School): readonly Content[] => [
  ...SMALL_POOLS[school],
  ...MINORS[school].map((n) => namedContent(n)),
  ...NOTABLES[school].slice(SPINE_NOTABLES).map((n) => namedContent(n)),
];

const SPINE_NOTABLES = 3;

interface SpineStep {
  depth: number;
  spine: "small" | "notable" | "keystone";
  twigSmalls: number;
  confluence?: 0 | 1;
}

const SPINE: readonly SpineStep[] = [
  { depth: 1, spine: "small", twigSmalls: 1 },
  { depth: 2, spine: "small", twigSmalls: 2 },
  { depth: 3, spine: "notable", twigSmalls: 0 },
  { depth: 4, spine: "small", twigSmalls: 2 },
  { depth: 5, spine: "small", twigSmalls: 1, confluence: 0 },
  { depth: 6, spine: "notable", twigSmalls: 0 },
  { depth: 7, spine: "small", twigSmalls: 2 },
  { depth: 8, spine: "small", twigSmalls: 2 },
  { depth: 9, spine: "notable", twigSmalls: 1, confluence: 1 },
  { depth: 10, spine: "small", twigSmalls: 2 },
  { depth: 11, spine: "small", twigSmalls: 2 },
  { depth: 12, spine: "keystone", twigSmalls: 0 },
];

const KEYSTONE_REQUIREMENT = 45;

const hubAnchor = (angleDeg: number): string => {
  const k = ((Math.round(angleDeg / 22.5) % 16) + 16) % 16;
  return `hub-o${String(k)}`;
};

const buildCluster = (school: School, angleDeg: number): ChartNodeDef[] => {
  const nodes: ChartNodeDef[] = [];
  const gateId = `${school}-gate`;
  nodes.push({
    id: gateId,
    constellation: school,
    kind: "gate",
    depth: 0,
    links: [hubAnchor(angleDeg)],
    ...GATE_CONTENT[school],
    name: `meta:chart.${school}Gate`,
  });

  const pool = basePool(school);
  const seen = new Set<string>([payloadKey(GATE_CONTENT[school])]);
  let cursor = 0;
  const nextSmall = (tier: number): Content => {
    for (let step = 0; step < pool.length; step += 1) {
      const base = pool[(cursor + step) % pool.length];
      if (base === undefined) continue;
      const scaled = scaleContent(base, tier);
      const key = payloadKey(scaled);
      if (seen.has(key)) continue;
      seen.add(key);
      cursor = (cursor + step + 1) % pool.length;
      return scaled;
    }
    cursor = (cursor + 1) % pool.length;
    return {};
  };

  const counters = { small: 0, notable: 0, confluence: 0 };
  const confluence = CONFLUENCE[school];
  const keystones = KEYSTONES[school];
  let parent = gateId;
  const notableIds: string[] = [];

  for (const step of SPINE) {
    const tier = smallTier(step.depth);
    let spineId = "";
    if (step.spine === "small") {
      counters.small += 1;
      spineId = `${school}-s${String(counters.small)}`;
      nodes.push({
        id: spineId,
        constellation: school,
        kind: "small",
        depth: step.depth,
        links: [parent],
        ...nextSmall(tier),
      });
    } else if (step.spine === "notable") {
      counters.notable += 1;
      const def = NOTABLES[school][counters.notable - 1];
      spineId = `${school}-not${String(counters.notable)}`;
      nodes.push({
        id: spineId,
        constellation: school,
        kind: "notable",
        depth: step.depth,
        links: [parent],
        ...(def === undefined ? {} : namedContent(def)),
        name: `meta:chart.${def?.key ?? spineId}`,
      });
      notableIds.push(spineId);
    } else {
      keystones.forEach((keystone, i) => {
        nodes.push({
          id: `${school}-key${String(i + 1)}`,
          constellation: school,
          kind: "keystone",
          depth: step.depth,
          links: [parent],
          requires: { pointsIn: { [school]: KEYSTONE_REQUIREMENT } },
          ...namedContent(keystone),
          name: `meta:chart.${keystone.key}`,
        });
      });
      continue;
    }

    for (let t = 0; t < step.twigSmalls; t += 1) {
      counters.small += 1;
      nodes.push({
        id: `${school}-s${String(counters.small)}`,
        constellation: school,
        kind: "small",
        depth: step.depth,
        links: [spineId],
        ...nextSmall(tier),
      });
    }

    if (step.confluence !== undefined) {
      counters.confluence += 1;
      const def = confluence[step.confluence];
      const id = `${school}-c${String(counters.confluence)}`;
      nodes.push({
        id,
        constellation: school,
        kind: "confluence",
        depth: step.depth,
        links: [spineId],
        scaledBy: confluenceScaling(school, step.confluence),
        ...namedContent(def),
        name: `meta:chart.${def.key}`,
      });
    }

    parent = spineId;
  }

  return nodes;
};

const buildNexus = (): ChartNodeDef[] =>
  NEXUS.map((def) => {
    const [a, b] = def.between;
    return {
      id: nexusId(def.between),
      constellation: "nexus" as const,
      kind: "nexus" as const,
      depth: 9,
      links: [`${a}-not3`, `${b}-not3`],
      requires: nexusRequirement(def.between),
      ...namedContent(def),
      name: `meta:chart.${def.key}` as LocKey,
    };
  });

const buildHub = (): ChartNodeDef[] => {
  const nodes: ChartNodeDef[] = [];
  const inner: string[] = [];
  for (let k = 0; k < 12; k += 1) {
    const id = `hub-i${String(k)}`;
    inner.push(id);
    nodes.push({
      id,
      constellation: "hub",
      kind: "small",
      depth: Math.min(k, 12 - k),
      ...(k === 0 ? { entry: true } : {}),
      links: [],
      ...(HUB_SMALLS[(k * 5) % HUB_SMALLS.length] ?? {}),
    });
  }
  for (let k = 0; k < 12; k += 1) {
    const from = nodes[k];
    if (from !== undefined) from.links = [inner[(k + 1) % 12] ?? inner[0] ?? ""];
  }

  let smallIdx = 0;
  for (let k = 0; k < 16; k += 1) {
    const id = `hub-o${String(k)}`;
    const named = HUB_NOTABLES[k];
    const anchorIndex = Math.floor((k * 12) / 16);
    const anchor = inner[anchorIndex] ?? inner[0] ?? "";
    const depth = Math.min(anchorIndex, 12 - anchorIndex) + 1;
    if (named !== undefined) {
      nodes.push({
        id,
        constellation: "hub",
        kind: "notable",
        depth,
        links: [anchor],
        ...named.content,
        name: `meta:chart.${named.key}`,
      });
    } else {
      nodes.push({
        id,
        constellation: "hub",
        kind: "small",
        depth,
        links: [anchor],
        ...(HUB_SMALLS[(smallIdx++ * 5 + 1) % HUB_SMALLS.length] ?? {}),
      });
    }
  }
  return nodes;
};

const buildChart = (): ChartNodeDef[] => {
  const nodes = [...buildHub()];
  SCHOOL_ORDER.forEach((school, i) => {
    const angleDeg = -90 + i * (360 / SCHOOL_ORDER.length);
    nodes.push(...buildCluster(school, angleDeg));
  });
  nodes.push(...buildNexus());
  return nodes;
};

export const CHART_NODES: readonly ChartNodeDef[] = buildChart();

export const HUB_BUDGET_NODE_ID = "hub-o12";
