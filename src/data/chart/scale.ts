import type { PerkMods } from "@/data/perks/types";
import type { Action, EffectDef } from "@/game/effects/types";

export const mapMagnitudes = (
  action: Action,
  f: (n: number) => number,
): Action => {
  switch (action.a) {
    case "dmg":
    case "shield":
    case "heal":
    case "charge":
    case "scrap":
    case "hull":
    case "modDieValue":
    case "addStatus":
    case "grant":
      return { ...action, n: f(action.n) };
    case "schedule":
      return { ...action, do: action.do.map((inner) => mapMagnitudes(inner, f)) };
    default:
      return action;
  }
};

export const actionMagnitudes = (actions: readonly Action[]): number[] => {
  const seen: number[] = [];
  for (const action of actions) {
    mapMagnitudes(action, (n) => {
      seen.push(n);
      return n;
    });
  }
  return seen;
};

export const mapEffectMagnitudes = (
  effect: EffectDef,
  f: (n: number) => number,
): EffectDef => ({
  ...effect,
  do: effect.do.map((action) => mapMagnitudes(action, f)),
});

export const mapModValues = (
  mods: Partial<PerkMods>,
  f: (n: number) => number,
): Partial<PerkMods> => {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(mods)) {
    out[key] = typeof value === "number" ? f(value) : 0;
  }
  return out as Partial<PerkMods>;
};
