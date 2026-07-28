import type { PerkMods, PerkTrait } from "@/data/perks/types";
import type { EffectDef } from "@/game/effects/types";
import type { SlotId } from "@/types/battle";
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
  budgetDelta?: number;
  slotTierDelta?: Partial<Record<SlotId, number>>;
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
const weaponsBurn: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
  do: [{ a: "addStatus", s: "burn", n: 1, target: "target" }],
};
const enginesBonus: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "engines" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const reactorBonus: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "slot", is: "reactor" }],
  do: [{ a: "modDieValue", n: 1 }],
};
const repeatValueCharge: EffectDef = {
  on: "rolled",
  if: [{ c: "equalsLast" }],
  do: [{ a: "charge", n: 1 }],
};
const maxFaceScrap: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "isMaxFace" }],
  do: [{ a: "scrap", n: 2 }],
};
const maxFaceHeal: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "school", is: "green" }, { c: "isMaxFace" }],
  do: [{ a: "heal", n: 1 }],
};
const minFaceCharge: EffectDef = {
  on: "afterResolveSlot",
  if: [{ c: "isMinFace" }],
  do: [{ a: "charge", n: 1 }],
};
const firstTurnAll: EffectDef = {
  on: "beforeResolveSlot",
  if: [{ c: "turnLte", n: 1 }],
  do: [{ a: "modDieValue", n: 1 }],
};

const HUB_SMALLS: readonly Content[] = [
  mod({ scrapMultPct: 3 }),
  mod({ shopDiscountPct: 3 }),
  mod({ hullMaxDelta: 1 }),
  mod({ battleStartScrap: 1 }),
  mod({ chargeCapDelta: 1 }),
  mod({ xpMultPct: 3 }),
  mod({ scrapPerKill: 1 }),
  mod({ battleEndHeal: 1 }),
];

// Six to eight distinct small effects per constellation; the builder cycles the
// pool to fill the ring, so every school reads as itself at any depth.
const SMALL_POOLS: Record<School, readonly Content[]> = {
  red: [
    eff([weaponsMaxFace], "meta:chartFx.fx.weaponsMaxFace"),
    eff([redFirstTurn], "meta:chartFx.fx.redFirstTurn"),
    mod({ markBonusDelta: 1 }),
    eff([weaponsBurn], "meta:chartFx.fx.weaponsBurn"),
    eff([weaponsLowHull], "meta:chartFx.fx.weaponsLowHull"),
    mod({ scrapPerKill: 1 }),
  ],
  blue: [
    eff([shieldsHigh], "meta:chartFx.fx.shieldsHigh"),
    mod({ jamPowerDelta: 1 }),
    eff([shieldsFlat], "meta:chartFx.fx.shieldsFlat"),
    mod({ hullMaxDelta: 2 }),
    mod({ blueReserveDelta: 1 }),
    eff([sensorsBonus], "meta:chartFx.fx.sensorsBonus"),
  ],
  green: [
    mod({ battleEndHeal: 1 }),
    mod({ growthCapDelta: 1 }),
    mod({ enginesThresholdDelta: 1 }),
    eff([enginesBonus], "meta:chartFx.fx.enginesBonus"),
    eff([maxFaceHeal], "meta:chartFx.fx.greenHeal"),
    eff([repeatValueCharge], "meta:chartFx.fx.repeatCharge"),
  ],
  yellow: [
    mod({ scrapMultPct: 5 }),
    mod({ battleStartScrap: 2 }),
    mod({ shopDiscountPct: 3 }),
    eff([maxFaceScrap], "meta:chartFx.fx.maxFaceScrap"),
    mod({ scrapPerKill: 2 }),
    mod({ xpMultPct: 4 }),
  ],
  black: [
    eff([minFaceScrap], "meta:chartFx.fx.minFaceScrap"),
    eff([weaponsLowHull], "meta:chartFx.fx.weaponsLowHull"),
    mod({ chargeCapDelta: 1 }),
    eff([reactorBonus], "meta:chartFx.fx.reactorBonus"),
    eff([minFaceCharge], "meta:chartFx.fx.minFaceCharge"),
    mod({ hullMaxDelta: 1, chargeCapDelta: 1 }),
  ],
  grey: [
    mod({ rerollSizeDelta: 1 }),
    mod({ nudgeCostDelta: -1 }),
    mod({ chargeCapDelta: 1 }),
    mod({ reserveDelta: 1 }),
    eff([sensorsBonus], "meta:chartFx.fx.sensorsBonus"),
    mod({ freeShopRerolls: 1 }),
  ],
  prismatic: [
    mod({ hullMaxDelta: 1, scrapMultPct: 3 }),
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
    { key: "redSpotter", mods: { markBonusDelta: 3 } },
    {
      key: "redFirestorm",
      fx: "meta:chartFx.fx.redFirestorm",
      effects: [
        {
          on: "afterResolveSlot",
          if: [{ c: "slot", is: "weapons" }, { c: "isMaxFace" }],
          do: [{ a: "addStatus", s: "burn", n: 3, target: "target" }],
        },
      ],
    },
    {
      key: "redSpine",
      fx: "meta:chartFx.fx.redSpine",
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "slot", is: "spinal" }],
          do: [{ a: "modDieValue", n: 4 }],
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
    { key: "blueBarrier", mods: { hullMaxDelta: 6 } },
    { key: "blueJammer", mods: { jamPowerDelta: 3 } },
    {
      key: "blueTideBreak",
      mods: { tideEffectDelta: -1 },
    },
  ],
  green: [
    { key: "greenSymbiosis", mods: { battleEndHeal: 2 } },
    { key: "greenChloro", mods: { growthCapDelta: 1, enginesThresholdDelta: 1 } },
    {
      key: "greenCanopy",
      fx: "meta:chartFx.fx.greenCanopy",
      effects: [
        {
          on: "beforeResolveSlot",
          if: [{ c: "slot", is: "engines" }],
          do: [{ a: "modDieValue", n: 3 }],
        },
      ],
    },
    { key: "greenPerennial", mods: { growthCapDelta: 2 } },
  ],
  yellow: [
    { key: "yellowLode", mods: { scrapMultPct: 15 } },
    { key: "yellowVein", mods: { battleStartScrap: 4, shopDiscountPct: 5 } },
    { key: "yellowTally", mods: { xpMultPct: 20 } },
    { key: "yellowBounty", mods: { scrapPerKill: 5 } },
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
    { key: "blackVent", traits: ["overflowShield"] },
    {
      key: "blackWell",
      fx: "meta:chartFx.fx.blackWell",
      effects: [
        {
          on: "afterResolveSlot",
          if: [{ c: "slot", is: "reactor" }],
          do: [{ a: "charge", n: 2 }],
        },
      ],
    },
  ],
  grey: [
    { key: "greyCool", mods: { rerollSizeDelta: 2 } },
    { key: "greyThrift", mods: { reserveDelta: 1, nudgeCostDelta: -1 } },
    { key: "greyToolkit", mods: { extraRerolls: 1 } },
    { key: "greyLedger", mods: { freeShopRerolls: 2, shopDiscountPct: 6 } },
  ],
  prismatic: [
    { key: "prismCore", mods: { hullMaxDelta: 2, scrapMultPct: 5 } },
    { key: "prismLattice", mods: { setCompleteCharge: 2 } },
    {
      key: "prismFacet",
      fx: "meta:chartFx.fx.firstTurnAll",
      effects: [firstTurnAll],
    },
    { key: "prismWell", mods: { chargeCapDelta: 3 } },
  ],
};

// Eight keystones (DESIGN §12.2): six school warps plus the two prismatic ones
// added in Phase 10.
const KEYSTONES: Record<School, readonly Named[]> = {
  red: [
    {
      key: "keyStormChaser",
      mods: { tideEffectDelta: 1, scrapMultPct: 30, xpMultPct: 30 },
    },
  ],
  blue: [
    {
      key: "keyIronDoctrine",
      mods: { hullMaxDelta: 12 },
      slotTierDelta: { engines: -1 },
    },
  ],
  green: [
    {
      key: "keyOvergrowth",
      mods: { hullMaxDelta: -5, growthCapDelta: 2, battleEndHeal: 2 },
    },
  ],
  yellow: [
    {
      key: "keyColdLogic",
      traits: ["coldLogic"],
      mods: { nudgeCostDelta: -3 },
    },
  ],
  black: [{ key: "keyObsidian", traits: ["obsidianPact"] }],
  grey: [
    {
      key: "keySingleCast",
      traits: ["singleCast"],
      fx: "meta:chartFx.fx.allDice1",
      effects: [{ on: "beforeResolveSlot", do: [{ a: "modDieValue", n: 1 }] }],
    },
  ],
  prismatic: [
    {
      key: "keyFatesFavorite",
      traits: ["fateTwice"],
      mods: { hullMaxPct: -20 },
    },
    {
      key: "keyPrismCascade",
      traits: ["prismDouble"],
      budgetDelta: -2,
    },
  ],
};

const SMALL_COUNT: Record<School, number> = {
  red: 25,
  blue: 25,
  green: 25,
  yellow: 25,
  black: 24,
  grey: 24,
  prismatic: 1,
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
  budgetDelta: n.budgetDelta,
  slotTierDelta: n.slotTierDelta,
});

const buildBody = (school: School): NodeSpec[] => {
  const pool = SMALL_POOLS[school];
  const count = SMALL_COUNT[school];
  const smalls: NodeSpec[] = Array.from({ length: count }, (_, i) => ({
    role: "small",
    ...(pool[i % pool.length] ?? {}),
  }));
  const notables = NOTABLES[school];

  const body: NodeSpec[] = [];
  const step = Math.max(1, Math.floor(count / (notables.length + 1)));
  let notableIdx = 0;
  smalls.forEach((s, i) => {
    body.push(s);
    if (notableIdx < notables.length && i + 1 === step * (notableIdx + 1)) {
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
  return body;
};

const hubAnchor = (angleDeg: number): string => {
  const k = ((Math.round(angleDeg / 22.5) % 16) + 16) % 16;
  return `hub-o${String(k)}`;
};

const chunk3 = <T,>(arr: readonly T[]): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += 3) out.push([...arr.slice(i, i + 3)]);
  return out;
};

const LATERALS: Record<number, readonly number[]> = {
  1: [0],
  2: [-32, 32],
  3: [-50, 0, 50],
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
    pos: place(angle, 150, 0),
    links: [hubAnchor(angleDeg)],
    ...GATE_CONTENT[school],
    name: `meta:chart.${school}Gate`,
  });

  const body = buildBody(school);
  const levels = chunk3(body);
  let prevIds = [gateId];
  const counters = { small: 0, notable: 0 };
  levels.forEach((level, li) => {
    const rad = 188 + li * 30;
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
        ...(spec.role === "notable"
          ? { name: `meta:chart.${spec.key ?? id}` }
          : {}),
      });
      return id;
    });
    prevIds = ids;
  });

  const keystones = KEYSTONES[school];
  keystones.forEach((keystone, i) => {
    const rad = 188 + levels.length * 30;
    const parent = prevIds[Math.min(i, prevIds.length - 1)] ?? gateId;
    const content = namedContent(keystone);
    nodes.push({
      id: `${school}-key${String(i + 1)}`,
      constellation: school,
      kind: "keystone",
      pos: place(angle, rad, keystones.length === 1 ? 0 : i === 0 ? -42 : 42),
      links: [parent],
      effects: content.effects,
      mods: content.mods,
      traits: content.traits,
      fx: content.fx,
      budgetDelta: content.budgetDelta,
      slotTierDelta: content.slotTierDelta,
      name: `meta:chart.${keystone.key}`,
    });
  });
  return nodes;
};

const HUB_NOTABLES: Record<number, { key: string; content: Content }> = {
  2: { key: "hubBarahol", content: mod({ shopDiscountPct: 10 }) },
  5: { key: "hubEngineering", content: mod({ moduleSlotDelta: 1 }) },
  7: {
    key: "hubCharts",
    content: eff([sensorsBonus], "meta:chartFx.fx.sensorsBonus"),
  },
  12: { key: "hubHangar", content: { hubBudget: true, budgetDelta: 1 } },
};

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
      entry: true,
      pos: place(k * 30 * DEG, 48, 0),
      links: [],
      ...(HUB_SMALLS[k % HUB_SMALLS.length] ?? {}),
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
    const anchor = inner[Math.floor((k * 12) / 16)] ?? inner[0] ?? "";
    if (named !== undefined) {
      nodes.push({
        id,
        constellation: "hub",
        kind: "notable",
        pos: place(k * 22.5 * DEG, 96, 0),
        links: [anchor],
        ...named.content,
        name: `meta:chart.${named.key}`,
      });
    } else {
      nodes.push({
        id,
        constellation: "hub",
        kind: "small",
        pos: place(k * 22.5 * DEG, 96, 0),
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
export const HUB_MODULE_NODE_ID = "hub-o5";
