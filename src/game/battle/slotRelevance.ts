import {
  CARGO_BY_ID,
  cargoChargeCapDelta,
  cargoSlotTierDelta,
} from "@/data/cargo";
import { CHART_NODE_BY_ID, CHART_NODES, type ChartNodeDef } from "@/data/chart";
import { DIE_BY_ID } from "@/data/dice";
import { engravingEffects, type EngravingMap } from "@/data/engravings";
import {
  FIRE_MODE_SLOTS,
  MODULE_FIRE_MODE,
  type FireModeId,
} from "@/data/fireModes";
import { MODULE_BY_ID } from "@/data/modules";
import { MUTATOR_BY_ID, type MutatorMods } from "@/data/mutators";
import { OFFICER_BY_ID, type OfficerActiveId } from "@/data/officers";
import { PERK_BY_ID } from "@/data/perks";
import { SHIP_PERK_SLOT_TIER } from "@/data/perks/ship";
import type { PerkMods, PerkTrait } from "@/data/perks/types";
import { RESONANCE_BONUSES, type ResonanceGrant } from "@/data/resonance";
import { SLOT_FAMILY } from "@/data/slots";
import { WEATHER_BY_ID } from "@/data/weather";
import { confluenceSteps, isAllocatable } from "@/game/chart/engine";
import {
  DEFAULT_EXCEED_HULL_COST,
  slotMatches,
} from "@/game/effects/evaluate";
import type { Action, Cond, EffectDef } from "@/game/effects/types";
import type { SlotId } from "@/types/battle";
import type { LocKey, School } from "@/types/content";

const NONE: readonly SlotId[] = [];
const BATTERIES: readonly SlotId[] = ["weaponA", "weaponB"];
const WEAPONS = SLOT_FAMILY.weapons;
const SHIELDS = SLOT_FAMILY.shields;
const ENGINES = SLOT_FAMILY.engines;
const SENSORS: readonly SlotId[] = ["sensors"];
const REACTOR: readonly SlotId[] = ["reactor"];
const REPAIR: readonly SlotId[] = ["repairBay"];

export const MOD_SLOT: Record<keyof PerkMods, readonly SlotId[]> = {
  rerollSizeDelta: NONE,
  reserveDelta: NONE,
  blueReserveDelta: NONE,
  nudgeCostDelta: REACTOR,
  shopDiscountPct: NONE,
  scrapMultPct: NONE,
  chargeCapDelta: REACTOR,
  hullMaxDelta: NONE,
  hullMaxPct: NONE,
  shieldKeepPct: SHIELDS,
  evasionDelta: ENGINES,
  markBonusDelta: SENSORS,
  jamPowerDelta: SENSORS,
  growthCapDelta: NONE,
  battleStartScrap: NONE,
  battleEndHeal: REPAIR,
  extraRerolls: NONE,
  scrapPerKill: NONE,
  setCompleteCharge: REACTOR,
  resonanceCountDelta: NONE,
  freeShopRerolls: NONE,
  xpMultPct: NONE,
  tideEffectDelta: NONE,
  moduleSlotDelta: NONE,
  firstHitReducePct: SHIELDS,
};

export const TRAIT_SLOT: Record<PerkTrait, readonly SlotId[]> = {
  bloodReactor: REACTOR,
  sacrifice: BATTERIES,
  ricochet: ["weaponA"],
  burnDouble: WEAPONS,
  stabilizer: NONE,
  spareLowest: NONE,
  compost: NONE,
  reflectDodge: ENGINES,
  dodgeCharge: ENGINES,
  singleCast: NONE,
  coldLogic: [...WEAPONS, "reactor"],
  obsidianPact: NONE,
  overflowShield: REACTOR,
  overflowCharge: REACTOR,
  houseEdge: NONE,
  greyIsBlack: NONE,
  firstHitPierce: BATTERIES,
  escapePod: NONE,
  blackBox: NONE,
  recycler: REACTOR,
  fateTwice: NONE,
  prismDouble: NONE,
};

export const MUTATOR_MOD_SLOT: Record<keyof MutatorMods, readonly SlotId[]> = {
  shieldDecayPct: SHIELDS,
  lootRarityStep: NONE,
  enemyHpPct: NONE,
  fogRowDelta: SENSORS,
  chargeCapDelta: REACTOR,
  scrapMultPct: NONE,
  noShops: NONE,
  resonanceBonus: NONE,
  nudgeCostDelta: REACTOR,
  damageMultPct: WEAPONS,
  jumpsPerTideDelta: NONE,
  sensorsTierDelta: SENSORS,
  barksOff: NONE,
  enemyCopies: NONE,
  copyHpPct: NONE,
};

export const GRANT_SLOT: Record<ResonanceGrant, readonly SlotId[]> = {
  blueRollFloor: NONE,
  blueAverageFloor: NONE,
  shieldPersist: SHIELDS,
  surviveLethal: NONE,
  copyAdjacent: NONE,
};

export const OFFICER_ACTIVE_SLOT: Record<OfficerActiveId, readonly SlotId[]> = {
  patch: REACTOR,
  restart: NONE,
  designate: SENSORS,
  brace: SHIELDS,
  crank: REACTOR,
  hymn: SENSORS,
};

export type RelevanceReason =
  | { kind: "slot" }
  | { kind: "slotMk"; n: 1 | 2 | 3 }
  | { kind: "exceedCap"; school?: School; hullCost: number; conditional: boolean }
  | { kind: "fireMode"; mode: FireModeId }
  | { kind: "mod"; field: keyof PerkMods; n: number }
  | { kind: "mutatorMod"; field: keyof MutatorMods; n: number }
  | { kind: "trait"; trait: PerkTrait }
  | { kind: "tierDelta"; n: number }
  | { kind: "grant"; grant: ResonanceGrant }
  | { kind: "officerActive"; active: OfficerActiveId };

export type SlotSourceKind =
  | "module"
  | "perk"
  | "chart"
  | "officer"
  | "cargo"
  | "mutator"
  | "resonance"
  | "die";

export interface SlotSource {
  kind: SlotSourceKind;
  id: string;
  name: LocKey | null;
  active: boolean;
  reasons: readonly RelevanceReason[];
}

export interface SlotLoadout {
  perks: readonly string[];
  modules: readonly string[];
  chartPicks: readonly string[];
  officers: readonly string[];
  cargo: readonly string[];
  mutators: readonly string[];
  deckDefIds: readonly string[];
  engravings?: EngravingMap;
  resonance?: Readonly<Record<School, number>>;
}

export interface Classifiable {
  effects?: readonly EffectDef[];
  mods?: Partial<PerkMods>;
  traits?: readonly PerkTrait[];
  slotTierDelta?: Partial<Record<SlotId, number>>;
}

const isSlotCond = (cond: Cond): boolean =>
  cond.c === "slot" || (cond.c === "any" && cond.of.some(isSlotCond));

const isStructuralCond = (cond: Cond): boolean =>
  cond.c === "slot" ||
  cond.c === "slotMk" ||
  (cond.c === "any" && cond.of.every(isStructuralCond));

const condMatchesSlot = (cond: Cond, slotId: SlotId): boolean => {
  if (cond.c === "slot") return slotMatches(slotId, cond.is);
  if (cond.c === "any") return cond.of.some((inner) => condMatchesSlot(inner, slotId));
  return false;
};

const condMkGates = (cond: Cond, slotId: SlotId): (1 | 2 | 3)[] => {
  if (cond.c === "slotMk") return cond.slot === slotId ? [cond.n] : [];
  if (cond.c === "any") return cond.of.flatMap((inner) => condMkGates(inner, slotId));
  return [];
};

const flatActions = (actions: readonly Action[]): Action[] =>
  actions.flatMap((action) =>
    action.a === "schedule" ? [action, ...flatActions(action.do)] : [action],
  );

const actionTargetsSlot = (action: Action, slotId: SlotId): boolean => {
  const sel = "sel" in action ? action.sel : undefined;
  return sel?.s === "dieInSlot" && sel.slot === slotId;
};

export const effectReasons = (
  effect: EffectDef,
  slotId: SlotId,
): RelevanceReason[] => {
  const conds = effect.if ?? [];
  const gated = conds.some(isSlotCond);
  const matched = conds.some((cond) => condMatchesSlot(cond, slotId));
  const actions = flatActions(effect.do);
  const out: RelevanceReason[] = conds
    .flatMap((cond) => condMkGates(cond, slotId))
    .map((n) => ({ kind: "slotMk", n }));
  if (matched || actions.some((action) => actionTargetsSlot(action, slotId))) {
    out.push({ kind: "slot" });
  }
  if (gated && !matched) return out;
  const conditional =
    (effect.on !== undefined && effect.on !== "battleStart") ||
    conds.some((cond) => !isStructuralCond(cond));
  for (const action of actions) {
    if (action.a !== "allowExceedCap") continue;
    if (action.slot !== undefined && !slotMatches(slotId, action.slot)) continue;
    out.push({
      kind: "exceedCap",
      ...(action.school === undefined ? {} : { school: action.school }),
      hullCost: action.hullCost ?? DEFAULT_EXCEED_HULL_COST,
      conditional,
    });
  }
  return out;
};

const dedupe = (reasons: readonly RelevanceReason[]): RelevanceReason[] => {
  const seen = new Set<string>();
  const out: RelevanceReason[] = [];
  for (const reason of reasons) {
    const key = JSON.stringify(reason);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(reason);
  }
  return out;
};

const effectsReasons = (
  effects: readonly EffectDef[] | undefined,
  slotId: SlotId,
): RelevanceReason[] =>
  (effects ?? []).flatMap((effect) => effectReasons(effect, slotId));

const modReasons = (
  mods: Partial<PerkMods> | undefined,
  slotId: SlotId,
): RelevanceReason[] => {
  const out: RelevanceReason[] = [];
  for (const [field, n] of Object.entries(mods ?? {}) as [
    keyof PerkMods,
    number | undefined,
  ][]) {
    if (n === undefined || n === 0) continue;
    if (MOD_SLOT[field].includes(slotId)) out.push({ kind: "mod", field, n });
  }
  return out;
};

export const contentReasons = (
  content: Classifiable,
  slotId: SlotId,
): RelevanceReason[] => {
  const out: RelevanceReason[] = [
    ...effectsReasons(content.effects, slotId),
    ...modReasons(content.mods, slotId),
  ];
  for (const trait of content.traits ?? []) {
    if (TRAIT_SLOT[trait].includes(slotId)) out.push({ kind: "trait", trait });
  }
  const delta = content.slotTierDelta?.[slotId];
  if (delta !== undefined && delta !== 0) out.push({ kind: "tierDelta", n: delta });
  return dedupe(out);
};

export const moduleReasons = (
  moduleId: string,
  slotId: SlotId,
): RelevanceReason[] => {
  const def = MODULE_BY_ID.get(moduleId);
  if (def === undefined) return [];
  const mode = MODULE_FIRE_MODE[moduleId];
  const granted: RelevanceReason[] =
    mode !== undefined && FIRE_MODE_SLOTS.includes(slotId)
      ? [{ kind: "fireMode", mode }]
      : [];
  return dedupe([...granted, ...contentReasons(def, slotId)]);
};

export const officerReasons = (
  officerId: string,
  slotId: SlotId,
): RelevanceReason[] => {
  const def = OFFICER_BY_ID.get(officerId);
  if (def === undefined) return [];
  const active: RelevanceReason[] = OFFICER_ACTIVE_SLOT[def.active.id].includes(
    slotId,
  )
    ? [{ kind: "officerActive", active: def.active.id }]
    : [];
  return dedupe([...modReasons(def.passive, slotId), ...active]);
};

export const cargoReasons = (
  cargoId: string,
  slotId: SlotId,
): RelevanceReason[] => {
  const def = CARGO_BY_ID.get(cargoId);
  if (def === undefined) return [];
  const out: RelevanceReason[] = [];
  const delta = cargoSlotTierDelta(def)[slotId];
  if (delta !== undefined && delta !== 0) out.push({ kind: "tierDelta", n: delta });
  const charge = cargoChargeCapDelta(def);
  if (charge !== 0 && MOD_SLOT.chargeCapDelta.includes(slotId)) {
    out.push({ kind: "mod", field: "chargeCapDelta", n: charge });
  }
  return out;
};

export const mutatorReasons = (
  mutatorId: string,
  slotId: SlotId,
): RelevanceReason[] => {
  const mutator = MUTATOR_BY_ID.get(mutatorId);
  const mods = mutator?.mods ?? WEATHER_BY_ID.get(mutatorId)?.mods;
  const out: RelevanceReason[] = [];
  for (const [field, n] of Object.entries(mods ?? {}) as [
    keyof MutatorMods,
    number | boolean | undefined,
  ][]) {
    if (typeof n !== "number" || n === 0) continue;
    if (!MUTATOR_MOD_SLOT[field].includes(slotId)) continue;
    out.push(
      field === "sensorsTierDelta"
        ? { kind: "tierDelta", n }
        : { kind: "mutatorMod", field, n },
    );
  }
  return dedupe([...out, ...effectsReasons(mutator?.effects, slotId)]);
};

const mutatorName = (mutatorId: string): LocKey | null =>
  MUTATOR_BY_ID.get(mutatorId)?.name ?? WEATHER_BY_ID.get(mutatorId)?.name ?? null;

const chartActive = (picks: readonly string[], node: ChartNodeDef): boolean =>
  node.scaledBy === undefined || confluenceSteps(picks, node) > 0;

const source = (
  kind: SlotSourceKind,
  id: string,
  name: LocKey | null,
  active: boolean,
  reasons: readonly RelevanceReason[],
): SlotSource[] => (reasons.length === 0 ? [] : [{ kind, id, name, active, reasons }]);

export const sourcesForSlot = (
  slotId: SlotId,
  loadout: SlotLoadout,
): readonly SlotSource[] => [
  ...loadout.modules.flatMap((id) =>
    source("module", id, MODULE_BY_ID.get(id)?.name ?? null, true, moduleReasons(id, slotId)),
  ),
  ...loadout.perks.flatMap((id) => {
    const def = PERK_BY_ID.get(id);
    return def === undefined
      ? []
      : source(
          "perk",
          id,
          def.name,
          true,
          contentReasons({ ...def, slotTierDelta: SHIP_PERK_SLOT_TIER[id] }, slotId),
        );
  }),
  ...loadout.chartPicks.flatMap((id) => {
    const node = CHART_NODE_BY_ID.get(id);
    return node === undefined
      ? []
      : source(
          "chart",
          id,
          node.name ?? null,
          chartActive(loadout.chartPicks, node),
          contentReasons(node, slotId),
        );
  }),
  ...loadout.officers.flatMap((id) =>
    source("officer", id, OFFICER_BY_ID.get(id)?.name ?? null, true, officerReasons(id, slotId)),
  ),
  ...loadout.cargo.flatMap((id) =>
    source("cargo", id, CARGO_BY_ID.get(id)?.name ?? null, true, cargoReasons(id, slotId)),
  ),
  ...loadout.mutators.flatMap((id) =>
    source("mutator", id, mutatorName(id), true, mutatorReasons(id, slotId)),
  ),
  ...RESONANCE_BONUSES.flatMap((bonus) =>
    source(
      "resonance",
      `${bonus.school}-${String(bonus.threshold)}`,
      bonus.desc,
      (loadout.resonance?.[bonus.school] ?? 0) >= bonus.threshold,
      dedupe([
        ...effectsReasons(bonus.effects, slotId),
        ...(bonus.grant !== undefined && GRANT_SLOT[bonus.grant].includes(slotId)
          ? [{ kind: "grant", grant: bonus.grant } as const]
          : []),
      ]),
    ),
  ),
  ...[...new Set(loadout.deckDefIds)].flatMap((defId) => {
    const def = DIE_BY_ID.get(defId);
    if (def === undefined) return [];
    return source(
      "die",
      defId,
      def.name,
      true,
      dedupe(
        effectsReasons(
          [...(def.effects ?? []), ...engravingEffects(loadout.engravings, defId)],
          slotId,
        ),
      ),
    );
  }),
];

export interface ChartAdvice {
  id: string;
  name: LocKey | null;
  allocatable: boolean;
  depth: number;
  reasons: readonly RelevanceReason[];
}

export const chartAdviceFor = (
  slotId: SlotId,
  picks: readonly string[],
): readonly ChartAdvice[] =>
  CHART_NODES.filter((node) => !picks.includes(node.id))
    .map((node) => ({
      id: node.id,
      name: node.name ?? null,
      allocatable: isAllocatable(node.id, picks),
      depth: node.depth,
      reasons: contentReasons(node, slotId),
    }))
    .filter((advice) => advice.reasons.length > 0)
    .sort(
      (a, b) =>
        Number(b.allocatable) - Number(a.allocatable) || a.depth - b.depth,
    );

export const slotMkUnlocks = (
  sources: readonly SlotSource[],
  mk: 1 | 2 | 3,
): readonly SlotSource[] =>
  sources.filter((entry) =>
    entry.reasons.some((reason) => reason.kind === "slotMk" && reason.n === mk),
  );
