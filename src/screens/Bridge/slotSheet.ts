import { DIE_BY_ID } from "@/data/dice";
import type { EngravingMap } from "@/data/engravings";
import {
  FIRE_MODES,
  FIRE_MODE_SLOTS,
  MODULE_FIRE_MODE,
  fireModesForSlot,
  fireModeVars,
  type FireModeId,
} from "@/data/fireModes";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import {
  affinitySchoolForSlot,
  ENGINE_SLOTS,
  slotCapForMk,
  type MkLevel,
} from "@/data/slots";
import {
  overCapAllowed,
  shipProfile,
  type PassiveHandlerId,
} from "@/game/battle/passives";
import {
  applySlotOverrides,
  buildBattleSnapshot,
  buildShipSlots,
  createEnemyStream,
} from "@/game/battle/setup";
import {
  chartAdviceFor,
  slotMkUnlocks,
  sourcesForSlot,
  type ChartAdvice,
  type SlotSource,
  type SlotSourceKind,
} from "@/game/battle/slotRelevance";
import {
  factsForSlot,
  systemWhatKey,
  type FactVars,
  type SystemFactId,
  type SystemFactSection,
} from "@/game/battle/systemFacts";
import { evasionTuningFor } from "@/game/battle/resolver";
import { SCHOOL_ORDER } from "@/data/schools";
import { fogRowsFor } from "@/game/map/fog";
import { sourceMods } from "@/game/run/runMods";
import { nudgeChargePrice } from "@/game/battle/view/actions";
import { slotAffinity, type SlotAffinity } from "@/game/battle/view/affinity";
import type { PlaceBlock } from "@/game/battle/view/legal";
import { projectSlot, type SlotProjection } from "@/game/battle/view/project";
import { dieTier } from "@/game/dice/tier";
import { discountedMkCost, nextMkFor } from "@/game/economy/prices";
import {
  battleInitFromRun,
  runDisabledSlots,
  runSlotTierDelta,
  type RunInitSource,
} from "@/game/run/battleInit";
import { createStreams } from "@/services/rng";
import type { RunValues } from "@/stores/runStore";
import type {
  BattleSnapshot,
  EnemyState,
  RolledDie,
  SlotId,
} from "@/types/battle";
import type { DieTier, LocKey, School } from "@/types/content";

export type SlotSheetRun = RunInitSource &
  Pick<RunValues, "mkLevels" | "deck" | "shipyardDiscount" | "ascension">;

const PROBE_ENEMY_HP = 999;
const PROBE_SEED = 0x5107;
export const PROBE_DIE_UID = "probe-die";
export const PLAIN_SCHOOL: School = "yellow";

const PROBE_ENEMY: EnemyState = {
  id: "probe-enemy",
  defId: "raider",
  hp: PROBE_ENEMY_HP,
  hpMax: PROBE_ENEMY_HP,
  shield: 0,
  intentIndex: 0,
  nextIntent: { t: "idle" },
  statuses: {},
  subsystems: [],
  phase: 0,
};

export interface SlotSheetConditions {
  turn: number;
  hullPct: number;
  enemyHpPct: number;
  enemies: number;
  charge: number;
  shield: number;
}

export const PROBE_CONDITIONS: SlotSheetConditions = {
  turn: 2,
  hullPct: 100,
  enemyHpPct: 100,
  enemies: 1,
  charge: 0,
  shield: 0,
};

export interface SlotSheetFact {
  id: SystemFactId;
  section: SystemFactSection;
  key: LocKey;
  vars: FactVars;
}

export type SlotSheetCell = SlotProjection & { school: School };

export type SlotSheetColumnKind = "plain" | "affinity" | "school";

export interface SlotSheetColumn {
  kind: SlotSheetColumnKind;
  probe: School;
  schools: readonly School[];
}

export interface SlotSheetRow {
  face: number;
  cells: readonly (SlotSheetCell | null)[];
}

export type FitRoute = "cap" | "overCap" | "grant" | "none";

export interface SlotFitRow {
  tier: DieTier;
  route: FitRoute;
  count: number;
}

export interface SlotFitGrant {
  sourceKind: SlotSourceKind;
  sourceId: string;
  school?: School;
  hullCost: number;
  conditional: boolean;
}

export interface SlotSheetFit {
  cap: DieTier;
  rows: readonly SlotFitRow[];
  overCap: { hullCost: number } | null;
  grants: readonly SlotFitGrant[];
}

export interface SlotSheetRule {
  block: PlaceBlock;
  key: LocKey;
}

export type FireModeSource = "base" | "mk" | "module";

export interface SlotSheetMode {
  id: FireModeId;
  source: FireModeSource;
  mk: MkLevel | null;
  moduleId: string | null;
  available: boolean;
  name: LocKey;
  desc: LocKey;
  vars: Record<string, number>;
}

export interface SlotSheetNextMk {
  mk: Exclude<MkLevel, 1>;
  cost: number;
  cap: DieTier;
  affinity: SlotAffinity | null;
  modes: readonly FireModeId[];
  unlocks: readonly SlotSource[];
}

export interface SlotPassiveNote {
  passive: PassiveHandlerId;
  name: LocKey;
  desc: LocKey;
}

export interface SlotSheetModel {
  slotId: SlotId;
  shipId: ShipId;
  mk: MkLevel;
  cap: DieTier;
  baseCap: DieTier;
  shrunk: boolean;
  disabled: boolean;
  affinity: SlotAffinity | null;
  passiveNote: SlotPassiveNote | null;
  what: LocKey;
  facts: readonly SlotSheetFact[];
  conditions: SlotSheetConditions;
  columns: readonly SlotSheetColumn[];
  table: readonly SlotSheetRow[];
  fit: SlotSheetFit;
  placement: readonly SlotSheetRule[];
  modes: readonly SlotSheetMode[];
  sources: readonly SlotSource[];
  nextMk: SlotSheetNextMk | null;
  chartAdvice: readonly ChartAdvice[];
}

const PASSIVE_TOUCHES: Record<
  PassiveHandlerId,
  (shipId: ShipId, slotId: SlotId) => boolean
> = {
  scrapper: () => false,
  overload: (shipId, slotId) => overCapAllowed(shipId, slotId) !== null,
  bulwark: (shipId, slotId) =>
    shipProfile(shipId).shieldKeepPct > 0 &&
    (slotId === "shields" || slotId === "shieldsB"),
  afterburner: (shipId, slotId) =>
    ENGINE_SLOTS.has(slotId) ||
    ((shipProfile(shipId).afterburner?.weapons ?? 0) > 0 &&
      (slotId === "weaponA" || slotId === "weaponB")),
  annealer: () => false,
  refractor: () => false,
};

const PLACE_RULES: Record<PlaceBlock, (overCap: boolean) => boolean> = {
  notAllowed: () => false,
  occupied: () => true,
  notInTray: () => true,
  dieLocked: () => true,
  slotBlocked: () => true,
  tierCap: (overCap) => !overCap,
};

const FIT_ORDER: readonly FitRoute[] = ["cap", "overCap", "grant", "none"];

export const probeBoard = (
  run: SlotSheetRun,
  engravings: EngravingMap,
): BattleSnapshot => {
  const init = battleInitFromRun(run, engravings);
  const streams = createStreams(PROBE_SEED);
  const built = buildBattleSnapshot(
    run.shipId,
    run.deck,
    [],
    streams,
    createEnemyStream(streams),
    run.mkLevels,
    { ...init, hull: init.hullMax },
  );
  return {
    ...built,
    turn: PROBE_CONDITIONS.turn,
    hull: Math.round((built.hullMax * PROBE_CONDITIONS.hullPct) / 100),
    shield: PROBE_CONDITIONS.shield,
    shieldPersist: 0,
    charge: PROBE_CONDITIONS.charge,
    evasion: null,
    nextTurnMods: {},
    sacrificePool: 0,
    blockedSlots: [],
    shrunkSlots: [],
    lockedDice: [],
    cursedDice: [],
    officers: [...init.officers],
    ...(init.echo === undefined ? {} : { echo: init.echo }),
    dice: built.dice.map(
      (die): RolledDie => ({
        ...die,
        state: "bag",
        slot: undefined,
        seat: undefined,
      }),
    ),
    enemies: [structuredClone(PROBE_ENEMY)],
    targetId: PROBE_ENEMY.id,
  };
};

const probeDie = (
  tier: DieTier,
  school: School,
  face: number,
): RolledDie => ({
  uid: PROBE_DIE_UID,
  defId: `probe:${school}`,
  tier,
  school,
  value: face,
  state: "tray",
});

export const withProbeDie = (
  board: BattleSnapshot,
  tier: DieTier,
  school: School,
  face: number,
): BattleSnapshot => ({
  ...board,
  dice: [...board.dice, probeDie(tier, school, face)],
});

const probeCell = (
  board: BattleSnapshot,
  slotId: SlotId,
  tier: DieTier,
  school: School,
  face: number,
): SlotSheetCell | null => {
  const projection = projectSlot(
    withProbeDie(board, tier, school, face),
    PROBE_DIE_UID,
    slotId,
  );
  return projection === null ? null : { ...projection, school };
};

const SHOWN_FIELDS = [
  "kind",
  "base",
  "value",
  "bonus",
  "amount",
  "evasion",
  "sensor",
  "overflowHull",
  "jammed",
  "hits",
  "fragments",
] as const satisfies readonly (keyof SlotProjection)[];

const sameValue = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) {
    return false;
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return [...keys].every((key) => sameValue(left[key], right[key]));
};

const sameCell = (a: SlotSheetCell | null, b: SlotSheetCell | null): boolean =>
  a === null || b === null
    ? a === b
    : SHOWN_FIELDS.every((field) => sameValue(a[field], b[field]));

const sameCells = (
  a: readonly (SlotSheetCell | null)[],
  b: readonly (SlotSheetCell | null)[],
): boolean =>
  a.length === b.length && a.every((cell, index) => sameCell(cell, b[index] ?? null));

const deckSchoolSet = (deck: SlotSheetRun["deck"]): ReadonlySet<School> =>
  new Set(
    deck.flatMap((entry) => {
      const school = DIE_BY_ID.get(entry.defId)?.school;
      return school === undefined ? [] : [school];
    }),
  );

const valueTable = (
  board: BattleSnapshot,
  slotId: SlotId,
  cap: DieTier,
  affinitySchool: School | null,
  held: ReadonlySet<School>,
): { columns: SlotSheetColumn[]; table: SlotSheetRow[] } => {
  const faces: number[] = [];
  const cellsBySchool = new Map<School, (SlotSheetCell | null)[]>(
    SCHOOL_ORDER.map((school) => [school, []]),
  );
  for (let face = 1; face <= cap; face += 1) {
    const plain = probeCell(board, slotId, cap, PLAIN_SCHOOL, face);
    if (plain === null) continue;
    faces.push(face);
    for (const school of SCHOOL_ORDER) {
      const cell =
        school === PLAIN_SCHOOL ? plain : probeCell(board, slotId, cap, school, face);
      cellsBySchool.get(school)?.push(cell);
    }
  }
  const cellsOf = (school: School): readonly (SlotSheetCell | null)[] =>
    cellsBySchool.get(school) ?? [];
  const plain: SlotSheetColumn = {
    kind: "plain",
    probe: PLAIN_SCHOOL,
    schools: [PLAIN_SCHOOL],
  };
  const affinity: SlotSheetColumn | null =
    affinitySchool === null
      ? null
      : { kind: "affinity", probe: affinitySchool, schools: [affinitySchool] };
  const apart: SlotSheetColumn[] = [];
  for (const school of SCHOOL_ORDER) {
    if (school === PLAIN_SCHOOL || school === affinitySchool) continue;
    const cells = cellsOf(school);
    const home = [plain, ...(affinity === null ? [] : [affinity]), ...apart].find(
      (column) => sameCells(cells, cellsOf(column.probe)),
    );
    if (home === undefined) {
      apart.push({ kind: "school", probe: school, schools: [school] });
    } else {
      home.schools = [...home.schools, school];
    }
  }
  const heldFirst = (column: SlotSheetColumn): number =>
    column.schools.some((school) => held.has(school)) ? 0 : 1;
  const columns = [
    plain,
    ...(affinity === null ? [] : [affinity]),
    ...apart.sort((a, b) => heldFirst(a) - heldFirst(b)),
  ];
  return {
    columns,
    table: faces.map((face, index) => ({
      face,
      cells: columns.map((column) => cellsOf(column.probe)[index] ?? null),
    })),
  };
};

const capAt = (
  run: SlotSheetRun,
  slotId: SlotId,
  mk: MkLevel,
): DieTier =>
  applySlotOverrides(
    buildShipSlots(run.shipId, { ...run.mkLevels, [slotId]: mk }),
    runSlotTierDelta(run),
  )[slotId]?.cap ?? slotCapForMk(slotId, mk);

const modeSource = (
  slotId: SlotId,
  id: FireModeId,
): Pick<SlotSheetMode, "source" | "mk" | "moduleId"> => {
  if (fireModesForSlot(slotId, 1, []).includes(id)) {
    return { source: "base", mk: null, moduleId: null };
  }
  const levels: readonly MkLevel[] = [2, 3];
  const mk = levels.find((level) => fireModesForSlot(slotId, level, []).includes(id));
  if (mk !== undefined) return { source: "mk", mk, moduleId: null };
  const moduleId =
    Object.keys(MODULE_FIRE_MODE).find((candidate) =>
      fireModesForSlot(slotId, 1, [candidate]).includes(id),
    ) ?? null;
  return { source: "module", mk: null, moduleId };
};

const slotSheetModes = (
  slotId: SlotId,
  mk: MkLevel,
  modules: readonly string[],
): readonly SlotSheetMode[] => {
  if (!FIRE_MODE_SLOTS.includes(slotId)) return [];
  const available = fireModesForSlot(slotId, mk, modules);
  return FIRE_MODES.map((def) => ({
    id: def.id,
    ...modeSource(slotId, def.id),
    available: available.includes(def.id),
    name: def.name,
    desc: def.desc,
    vars: fireModeVars(def),
  }));
};

const fitGrants = (sources: readonly SlotSource[]): SlotFitGrant[] =>
  sources
    .filter((entry) => entry.active)
    .flatMap((entry) =>
      entry.reasons.flatMap((reason) =>
        reason.kind === "exceedCap"
          ? [
              {
                sourceKind: entry.kind,
                sourceId: entry.id,
                ...(reason.school === undefined ? {} : { school: reason.school }),
                hullCost: reason.hullCost,
                conditional: reason.conditional,
              },
            ]
          : [],
      ),
    );

const fitRoute = (
  tier: DieTier,
  school: School,
  cap: DieTier,
  overCap: boolean,
  grants: readonly SlotFitGrant[],
): FitRoute => {
  if (tier <= cap) return "cap";
  if (overCap) return "overCap";
  if (
    grants.some(
      (grant) =>
        !grant.conditional &&
        (grant.school === undefined ||
          grant.school === school ||
          school === "prismatic"),
    )
  ) {
    return "grant";
  }
  return "none";
};

const slotSheetFit = (
  run: Pick<SlotSheetRun, "deck" | "shipId">,
  slotId: SlotId,
  cap: DieTier,
  sources: readonly SlotSource[],
): SlotSheetFit => {
  const rule = overCapAllowed(run.shipId, slotId);
  const grants = fitGrants(sources);
  const tally = new Map<string, SlotFitRow>();
  for (const entry of run.deck) {
    const def = DIE_BY_ID.get(entry.defId);
    if (def === undefined) continue;
    const tier = dieTier(entry);
    const route = fitRoute(tier, def.school, cap, rule !== null, grants);
    const key = `${String(tier)}:${route}`;
    const row = tally.get(key);
    tally.set(key, { tier, route, count: (row?.count ?? 0) + 1 });
  }
  return {
    cap,
    rows: [...tally.values()].sort(
      (a, b) =>
        a.tier - b.tier || FIT_ORDER.indexOf(a.route) - FIT_ORDER.indexOf(b.route),
    ),
    overCap: rule === null ? null : { hullCost: rule.hullCost },
    grants,
  };
};

const slotPlacementRules = (
  shipId: ShipId,
  slotId: SlotId,
): readonly SlotSheetRule[] => {
  const overCap = overCapAllowed(shipId, slotId) !== null;
  return (Object.keys(PLACE_RULES) as PlaceBlock[])
    .filter((block) => PLACE_RULES[block](overCap))
    .map((block) => ({ block, key: `battle:block.${block}` }));
};

const slotPassiveNote = (
  shipId: ShipId,
  slotId: SlotId,
): SlotPassiveNote | null => {
  const ship = SHIP_BY_ID.get(shipId);
  const passive = ship?.passive;
  if (
    passive === undefined ||
    ship?.passiveName === undefined ||
    ship.passiveDesc === undefined
  ) {
    return null;
  }
  if (!PASSIVE_TOUCHES[passive.kind](shipId, slotId)) return null;
  return { passive: passive.kind, name: ship.passiveName, desc: ship.passiveDesc };
};

const nextMkRow = (
  run: SlotSheetRun,
  slotId: SlotId,
  mk: MkLevel,
  sources: readonly SlotSource[],
): SlotSheetNextMk | null => {
  const next = nextMkFor(slotId, mk, run.ascension);
  if (next === null) return null;
  const before = fireModesForSlot(slotId, mk, run.modules);
  return {
    mk: next,
    cost: discountedMkCost(next, run.shipyardDiscount),
    cap: capAt(run, slotId, next),
    affinity: slotAffinity(slotId, { mk: next }),
    modes: fireModesForSlot(slotId, next, run.modules).filter(
      (id) => !before.includes(id),
    ),
    unlocks: slotMkUnlocks(sources, next),
  };
};

export const slotSheetModel = (
  run: SlotSheetRun,
  engravings: EngravingMap,
  slotId: SlotId,
): SlotSheetModel | null => {
  const shipSlot = SHIP_BY_ID.get(run.shipId)?.slots[slotId];
  if (shipSlot === undefined) return null;
  const mk: MkLevel = run.mkLevels[slotId] ?? shipSlot.mk;
  const baseCap = slotCapForMk(slotId, mk);
  const cap = capAt(run, slotId, mk);
  const disabled = runDisabledSlots(run).includes(slotId);
  const affinity = slotAffinity(slotId, { mk });
  const affinitySchool =
    affinity === null ? null : (affinitySchoolForSlot(slotId) ?? null);
  const board = probeBoard(run, engravings);
  const sources = sourcesForSlot(slotId, {
    perks: run.perks,
    modules: run.modules,
    chartPicks: run.chartPicks,
    officers: run.officers,
    cargo: run.cargo.map((held) => held.defId),
    mutators: run.mutators,
    deckDefIds: run.deck.map((entry) => entry.defId),
    engravings,
    resonance: board.resonance.counts,
  });
  const boardMods = sourceMods(board);
  const factInput = {
    shipId: run.shipId,
    nudgeCost: nudgeChargePrice(board),
    chargeCap: board.chargeCap,
    markBonus: boardMods.markBonusDelta,
    evasionFlat: boardMods.evasionDelta + evasionTuningFor(run.shipId).delta,
    fogRows: fogRowsFor({
      sensorsMk: 1,
      deepScan: false,
      bonusReveal: 0,
      sectorReveal: 0,
      echo: run.echo,
      mutators: run.mutators,
    }),
  };
  const { columns, table } = disabled
    ? { columns: [], table: [] }
    : valueTable(board, slotId, cap, affinitySchool, deckSchoolSet(run.deck));
  return {
    slotId,
    shipId: run.shipId,
    mk,
    cap,
    baseCap,
    shrunk: cap < baseCap,
    disabled,
    affinity,
    passiveNote: slotPassiveNote(run.shipId, slotId),
    what: systemWhatKey(slotId),
    facts: factsForSlot(slotId, factInput).map((fact) => ({
      id: fact.id,
      section: fact.section,
      key: fact.text,
      vars: fact.vars(factInput),
    })),
    conditions: PROBE_CONDITIONS,
    columns,
    table,
    fit: disabled
      ? { cap, rows: [], overCap: null, grants: [] }
      : slotSheetFit(run, slotId, cap, sources),
    placement: disabled ? [] : slotPlacementRules(run.shipId, slotId),
    modes: disabled ? [] : slotSheetModes(slotId, mk, run.modules),
    sources,
    nextMk: disabled ? null : nextMkRow(run, slotId, mk, sources),
    chartAdvice: disabled ? [] : chartAdviceFor(slotId, run.chartPicks),
  };
};
