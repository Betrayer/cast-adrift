import type { ContentTag } from "@/data/tags";
import type { Action, Cond, EffectDef } from "@/game/effects/types";

export interface ShapedContent {
  effects?: readonly EffectDef[];
  mods?: Readonly<Record<string, number | undefined>>;
  traits?: readonly string[];
  grant?: string;
}

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, inner]) => inner !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([key, inner]) => `${key}:${stable(inner)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
};

const definedMods = (
  mods: Readonly<Record<string, number | undefined>> | undefined,
): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(mods ?? {})) {
    if (value !== undefined && value !== 0) out[key] = value;
  }
  return out;
};

export const normalizedBody = (def: ShapedContent): string =>
  stable({
    effects: def.effects ?? [],
    mods: definedMods(def.mods),
    traits: [...(def.traits ?? [])].sort((a, b) => a.localeCompare(b)),
    grant: def.grant ?? null,
  });

const condKinds = (cond: Cond): string[] => {
  if (cond.c === "any") return cond.of.flatMap(condKinds);
  if (cond.c === "not") return condKinds(cond.of);
  if (cond.c === "slot") return [`slot=${cond.is}`];
  return [cond.c];
};

const actionKinds = (action: Action): string[] => {
  if (action.a === "schedule") return ["schedule", ...action.do.flatMap(actionKinds)];
  return [action.a];
};

const effectShape = (def: EffectDef): string => {
  const conds = [...new Set((def.if ?? []).flatMap(condKinds))].sort((a, b) =>
    a.localeCompare(b),
  );
  const actions = [...new Set(def.do.flatMap(actionKinds))].sort((a, b) =>
    a.localeCompare(b),
  );
  return `${def.on}[${conds.join("+")}]>${actions.join("+")}`;
};

const computeShapeKey = (def: ShapedContent): string => {
  const effects = (def.effects ?? []).map(effectShape).sort((a, b) =>
    a.localeCompare(b),
  );
  const mods = Object.keys(definedMods(def.mods)).sort((a, b) => a.localeCompare(b));
  const traits = [...(def.traits ?? [])].sort((a, b) => a.localeCompare(b));
  return [
    effects.join("|"),
    mods.length === 0 ? "" : `mods:${mods.join("+")}`,
    traits.length === 0 ? "" : `traits:${traits.join("+")}`,
    def.grant === undefined ? "" : `grant:${def.grant}`,
  ]
    .filter((part) => part !== "")
    .join(" ");
};

const shapeCache = new WeakMap<ShapedContent, string>();

export const shapeKey = (def: ShapedContent): string => {
  const cached = shapeCache.get(def);
  if (cached !== undefined) return cached;
  const key = computeShapeKey(def);
  shapeCache.set(def, key);
  return key;
};

const SCALAR_ACTIONS: ReadonlySet<Action["a"]> = new Set([
  "modDieValue",
  "setDieValue",
  "shield",
  "heal",
  "charge",
  "scrap",
  "dmg",
  "hull",
]);

export const isSingleScalar = (def: ShapedContent): boolean => {
  if (def.grant !== undefined) return false;
  if ((def.traits ?? []).length > 0) return false;
  const effects = def.effects ?? [];
  const mods = Object.keys(definedMods(def.mods));
  if (effects.length === 0) return mods.length === 1;
  if (effects.length > 1 || mods.length > 0) return false;
  const only = effects[0];
  if (only === undefined || only.do.length !== 1) return false;
  const action = only.do[0];
  return action !== undefined && SCALAR_ACTIONS.has(action.a);
};

const isTagCond = (cond: Cond): boolean => {
  if (cond.c === "any") return cond.of.some(isTagCond);
  if (cond.c === "not") return isTagCond(cond.of);
  return cond.c === "hasTag" || cond.c === "countTag";
};

const actionTags = (action: Action): ContentTag[] => {
  if (action.a === "schedule") return action.do.flatMap(actionTags);
  return "perTag" in action && action.perTag !== undefined ? [action.perTag] : [];
};

const condTags = (cond: Cond): ContentTag[] => {
  if (cond.c === "any") return cond.of.flatMap(condTags);
  if (cond.c === "not") return condTags(cond.of);
  return cond.c === "hasTag" || cond.c === "countTag" ? [cond.tag] : [];
};

export const referencedTagsOf = (def: ShapedContent): ContentTag[] => [
  ...new Set(
    (def.effects ?? []).flatMap((effect) => [
      ...(effect.if ?? []).flatMap(condTags),
      ...effect.do.flatMap(actionTags),
    ]),
  ),
];

export const tagConditionedEffects = (def: ShapedContent): number =>
  (def.effects ?? []).filter(
    (effect) =>
      (effect.if ?? []).some(isTagCond) || effect.do.flatMap(actionTags).length > 0,
  ).length;

export const hasTradeOffMods = (def: ShapedContent): boolean => {
  const values = Object.values(definedMods(def.mods));
  return values.some((n) => n < 0) && values.some((n) => n > 0);
};

export const isConditional = (def: ShapedContent): boolean =>
  (def.traits ?? []).length > 0 ||
  hasTradeOffMods(def) ||
  tagConditionedEffects(def) > 0 ||
  (def.effects ?? []).some((effect) => (effect.if ?? []).length > 0);

const PAIRED_SLOTS: ReadonlySet<string> = new Set([
  "weaponA",
  "weaponB",
  "shieldsB",
  "enginesB",
]);

const HARDWARE_ACTIONS: ReadonlySet<Action["a"]> = new Set([
  "counter",
  "schedule",
  "grant",
  "allowExceedCap",
  "addTempDie",
  "removeTempDie",
  "primeSchool",
  "rerollDie",
]);

const RUN_SCOPE_HOOKS: ReadonlySet<EffectDef["on"]> = new Set([
  "nodeEnter",
  "shopEnter",
  "eventOutcome",
]);

const bindsSlotInstance = (cond: Cond): boolean => {
  if (cond.c === "any") return cond.of.some(bindsSlotInstance);
  if (cond.c === "not") return bindsSlotInstance(cond.of);
  if (cond.c === "slotMk") return true;
  return cond.c === "slot" && PAIRED_SLOTS.has(cond.is);
};

export const usesModuleVocabulary = (def: ShapedContent): boolean =>
  (def.effects ?? []).some(
    (effect) =>
      RUN_SCOPE_HOOKS.has(effect.on) ||
      (effect.if ?? []).some(bindsSlotInstance) ||
      effect.do.flatMap(actionKinds).some((a) => HARDWARE_ACTIONS.has(a as Action["a"])),
  );
