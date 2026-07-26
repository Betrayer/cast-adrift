import type { PerkMods, PerkTrait } from "@/data/perks/types";
import type { EffectDef } from "@/game/effects/types";
import type { LocKey, School } from "@/types/content";
import type { ChartNodeDef, ChartNodeKind } from "@/data/chart/types";

const CENTER = 500;
const DEG = Math.PI / 180;

const place = (
  angle: number,
  radius: number,
  lateral: number,
): { x: number; y: number } => ({
  x: Math.round(CENTER + radius * Math.cos(angle) + lateral * -Math.sin(angle)),
  y: Math.round(CENTER + radius * Math.sin(angle) + lateral * Math.cos(angle)),
});

interface Content {
  effects?: readonly EffectDef[];
  mods?: Partial<PerkMods>;
  traits?: readonly PerkTrait[];
  fx?: LocKey;
  hubBudget?: boolean;
}

interface NodeSpec extends Content {
  role: ChartNodeKind;
  key?: string;
}

const mod = (m: Partial<PerkMods>): Content => ({ mods: m });
const eff = (effects: readonly EffectDef[], fx: LocKey): Content => ({
  effects,
  fx,
});

const weaponsMaxFace: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const redFirstTurn: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "school", is: "red" }, { c: "turnLte", n: 1 }],
  do: [{ a: "modDieValue", n: 1 }],
};
const shieldsHigh: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "shields" }, { c: "valueGte", n: 6 }],
  do: [{ a: "shield", n: 1 }],
};
const shieldsFlat: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "shields" }],
  do: [{ a: "shield", n: 1 }],
};
const minFaceScrap: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "isMinFace" }],
  do: [{ a: "scrap", n: 2 }],
};
const weaponsLowHull: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "hullPctLt", n: 50 }],
  do: [{ a: "modDieValue", n: 1 }],
};
const sensorsBonus: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "sensors" }],
  do: [{ a: "modDieValue", n: 1 }],
};

const HUB_SMALLS: readonly Content[] = [
  mod({ scrapMultPct: 3 }),
  mod({ shopDiscountPct: 3 }),
  mod({ hullMaxDelta: 1 }),
  mod({ battleStartScrap: 1 }),
  mod({ chargeCapDelta: 1 }),
];

const SMALL_POOLS: Record<School, readonly Content[]> = {
  red: [
    eff([weaponsMaxFace], "meta:chartFx.fx.weaponsMaxFace"),
    eff([redFirstTurn], "meta:chartFx.fx.redFirstTurn"),
    mod({ markBonusDelta: 1 }),
  ],
  blue: [
    eff([shieldsHigh], "meta:chartFx.fx.shieldsHigh"),
    mod({ jamPowerDelta: 1 }),
    eff([shieldsFlat], "meta:chartFx.fx.shieldsFlat"),
  ],
  green: [
    mod({ battleEndHeal: 1 }),
    mod({ growthCapDelta: 1 }),
    mod({ enginesThresholdDelta: 1 }),
  ],
  yellow: [
    mod({ scrapMultPct: 5 }),
    mod({ battleStartScrap: 2 }),
    mod({ shopDiscountPct: 3 }),
  ],
  black: [
    eff([minFaceScrap], "meta:chartFx.fx.minFaceScrap"),
    eff([weaponsLowHull], "meta:chartFx.fx.weaponsLowHull"),
    mod({ chargeCapDelta: 1 }),
  ],
  grey: [
    mod({ rerollSizeDelta: 1 }),
    mod({ nudgeCostDelta: -1 }),
    mod({ chargeCapDelta: 1 }),
  ],
  prismatic: [
    mod({ hullMaxDelta: 1 }),
    mod({ scrapMultPct: 3 }),
    mod({ chargeCapDelta: 1 }),
    mod({ markBonusDelta: 1 }),
  ],
};

const GATE_CONTENT: Record<School, Content> = {
  red: eff([redFirstTurn], "meta:chartFx.fx.redFirstTurn"),
  blue: eff([shieldsHigh], "meta:chartFx.fx.shieldsHigh"),
  green: mod({ battleEndHeal: 1 }),
  yellow: mod({ scrapMultPct: 5 }),
  black: eff([minFaceScrap], "meta:chartFx.fx.minFaceScrap"),
  grey: mod({ rerollSizeDelta: 1 }),
  prismatic: mod({ hullMaxDelta: 1 }),
};

interface Named extends Content {
  key: string;
}

const NOTABLES: Record<School, readonly Named[]> = {
  red: [
    {
      key: "redSalvo",
      fx: "meta:chartFx.fx.redSalvo",
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "slot", is: "weapons" }, { c: "turnLte", n: 1 }],
          do: [{ a: "modDieValue", n: 3 }],
        },
      ],
    },
  ],
  blue: [
    {
      key: "blueGlacier",
      fx: "meta:chartFx.fx.blueGlacier",
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "slot", is: "shields" }],
          do: [{ a: "shield", n: 2 }],
        },
      ],
    },
  ],
  green: [
    { key: "greenSymbiosis", mods: { battleEndHeal: 2 } },
    { key: "greenChloro", mods: { growthCapDelta: 1, enginesThresholdDelta: 1 } },
  ],
  yellow: [
    { key: "yellowLode", mods: { scrapMultPct: 15 } },
    { key: "yellowVein", mods: { battleStartScrap: 4, shopDiscountPct: 5 } },
  ],
  black: [
    {
      key: "blackEdge",
      fx: "meta:chartFx.fx.blackEdge",
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "hullPctLt", n: 20 }],
          do: [{ a: "modDieValue", n: 2 }],
        },
      ],
    },
    { key: "blackReserve", mods: { chargeCapDelta: 2 } },
  ],
  grey: [
    { key: "greyCool", mods: { rerollSizeDelta: 2 } },
    { key: "greyThrift", mods: { reserveDelta: 1, nudgeCostDelta: -1 } },
  ],
  prismatic: [{ key: "prismCore", mods: { hullMaxDelta: 2, scrapMultPct: 5 } }],
};

const KEYSTONES: Partial<Record<School, Named>> = {
  green: {
    key: "keyOvergrowth",
    mods: { hullMaxDelta: -5, growthCapDelta: 2, battleEndHeal: 2 },
  },
  yellow: {
    key: "keyColdLogic",
    traits: ["coldLogic"],
    mods: { nudgeCostDelta: -3 },
  },
  black: { key: "keyObsidian", traits: ["obsidianPact"] },
  grey: {
    key: "keySingleCast",
    traits: ["singleCast"],
    fx: "meta:chartFx.fx.allDice1",
    effects: [{ on: "beforeResolveSlot", do: [{ a: "modDieValue", n: 1 }] }],
  },
};

const SMALL_COUNT: Record<School, number> = {
  red: 12,
  blue: 12,
  green: 11,
  yellow: 11,
  black: 12,
  grey: 12,
  prismatic: 4,
};

const SCHOOL_ORDER: readonly School[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
];

const namedContent = (n: Named): Content => ({
  effects: n.effects,
  mods: n.mods,
  traits: n.traits,
  fx: n.fx,
});

const buildBody = (school: School): NodeSpec[] => {
  const pool = SMALL_POOLS[school];
  const count = SMALL_COUNT[school];
  const smalls: NodeSpec[] = Array.from({ length: count }, (_, i) => ({
    role: "small",
    ...(pool[i % pool.length] ?? {}),
  }));
  const notables = NOTABLES[school];
  const keystone = KEYSTONES[school];

  const body: NodeSpec[] = [];
  const step = Math.max(1, Math.floor(count / (notables.length + 1)));
  let notableIdx = 0;
  smalls.forEach((s, i) => {
    body.push(s);
    if (
      notableIdx < notables.length &&
      i + 1 === step * (notableIdx + 1)
    ) {
      const nt = notables[notableIdx];
      if (nt !== undefined) {
        body.push({ role: "notable", key: nt.key, ...namedContent(nt) });
      }
      notableIdx += 1;
    }
  });
  while (notableIdx < notables.length) {
    const nt = notables[notableIdx];
    if (nt !== undefined)
      body.push({ role: "notable", key: nt.key, ...namedContent(nt) });
    notableIdx += 1;
  }
  if (keystone !== undefined) {
    body.push({ role: "keystone", key: keystone.key, ...namedContent(keystone) });
  }
  return body;
};

const hubAnchor = (angleDeg: number): string => {
  const k = ((Math.round(angleDeg / 22.5) % 16) + 16) % 16;
  return `hub-o${String(k)}`;
};

const chunk3 = <T>(arr: readonly T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 3) out.push([...arr.slice(i, i + 3)]);
  return out;
};

const LATERALS: Record<number, readonly number[]> = {
  1: [0],
  2: [-46, 46],
  3: [-72, 0, 72],
};

const buildCluster = (school: School, angleDeg: number): ChartNodeDef[] => {
  const angle = angleDeg * DEG;
  const nodes: ChartNodeDef[] = [];
  const gateId = `${school}-gate`;
  nodes.push({
    id: gateId,
    constellation: school,
    kind: "gate",
    entry: true,
    pos: place(angle, 205, 0),
    links: [hubAnchor(angleDeg)],
    ...GATE_CONTENT[school],
    name: `meta:chart.${school}Gate`,
  });

  const body = buildBody(school);
  const keystone =
    body.length > 0 && body[body.length - 1]?.role === "keystone"
      ? body.pop()
      : undefined;
  const levels = chunk3(body);
  let prevIds = [gateId];
  const counters = { small: 0, notable: 0 };
  levels.forEach((level, li) => {
    const rad = 258 + li * 48;
    const lats = LATERALS[level.length] ?? LATERALS[3] ?? [0];
    const ids = level.map((spec, j) => {
      const id =
        spec.role === "notable"
          ? `${school}-not${String((counters.notable += 1))}`
          : `${school}-s${String((counters.small += 1))}`;
      const parent = prevIds[Math.min(j, prevIds.length - 1)] ?? gateId;
      nodes.push({
        id,
        constellation: school,
        kind: spec.role,
        pos: place(angle, rad, lats[j] ?? 0),
        links: [parent],
        effects: spec.effects,
        mods: spec.mods,
        traits: spec.traits,
        fx: spec.fx,
        ...(spec.role === "notable" ? { name: `meta:chart.${spec.key ?? id}` } : {}),
      });
      return id;
    });
    prevIds = ids;
  });
  if (keystone !== undefined) {
    const rad = 258 + levels.length * 48;
    const parent = prevIds[Math.floor(prevIds.length / 2)] ?? gateId;
    nodes.push({
      id: `${school}-key`,
      constellation: school,
      kind: "keystone",
      pos: place(angle, rad, 0),
      links: [parent],
      effects: keystone.effects,
      mods: keystone.mods,
      traits: keystone.traits,
      fx: keystone.fx,
      name: `meta:chart.${keystone.key ?? "key"}`,
    });
  }
  return nodes;
};

const buildHub = (): ChartNodeDef[] => {
  const nodes: ChartNodeDef[] = [];
  const inner: string[] = [];
  for (let k = 0; k < 8; k += 1) {
    const id = `hub-i${String(k)}`;
    inner.push(id);
    nodes.push({
      id,
      constellation: "hub",
      kind: "small",
      entry: true,
      pos: place(k * 45 * DEG, 66, 0),
      links: [],
      ...(HUB_SMALLS[k % HUB_SMALLS.length] ?? {}),
    });
  }
  for (let k = 0; k < 8; k += 1) {
    const from = nodes[k];
    if (from !== undefined) from.links = [inner[(k + 1) % 8] ?? inner[0] ?? ""];
  }

  const hubNotables: Record<number, { key: string; content: Content }> = {
    2: { key: "hubBarahol", content: mod({ shopDiscountPct: 10 }) },
    7: {
      key: "hubCharts",
      content: eff([sensorsBonus], "meta:chartFx.fx.sensorsBonus"),
    },
    12: { key: "hubHangar", content: { hubBudget: true } },
  };

  let smallIdx = 0;
  for (let k = 0; k < 16; k += 1) {
    const id = `hub-o${String(k)}`;
    const named = hubNotables[k];
    const anchor = inner[Math.floor(k / 2)] ?? inner[0] ?? "";
    if (named !== undefined) {
      nodes.push({
        id,
        constellation: "hub",
        kind: "notable",
        pos: place(k * 22.5 * DEG, 132, 0),
        links: [anchor],
        ...named.content,
        name: `meta:chart.${named.key}`,
      });
    } else {
      nodes.push({
        id,
        constellation: "hub",
        kind: "small",
        pos: place(k * 22.5 * DEG, 132, 0),
        links: [anchor],
        ...(HUB_SMALLS[smallIdx++ % HUB_SMALLS.length] ?? {}),
      });
    }
  }
  return nodes;
};

const buildChart = (): ChartNodeDef[] => {
  const nodes = [...buildHub()];
  SCHOOL_ORDER.forEach((school, i) => {
    const angleDeg = -90 + i * (360 / 7);
    nodes.push(...buildCluster(school, angleDeg));
  });
  return nodes;
};

export const CHART_NODES: readonly ChartNodeDef[] = buildChart();

export const HUB_BUDGET_NODE_ID = "hub-o12";
