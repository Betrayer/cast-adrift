import { BattleCtx, dieFaceMax, dieFaceMin } from "@/game/effects/context";
import type { Action, Cond, EffectDef, Hook, SlotMatch } from "@/game/effects/types";
import type { RolledDie, SlotId } from "@/types/battle";

const WEAPON_SLOTS: ReadonlySet<SlotId> = new Set([
  "weaponA",
  "weaponB",
  "spinal",
]);

export const slotMatches = (
  slotId: SlotId | undefined,
  match: SlotMatch,
): boolean => {
  if (slotId === undefined) return false;
  if (match === "weapons") return WEAPON_SLOTS.has(slotId);
  return slotId === match;
};

const condMatches = (
  cond: Cond,
  ctx: BattleCtx,
  subject: RolledDie | null,
): boolean => {
  switch (cond.c) {
    case "school":
      return (
        subject !== null &&
        (subject.school === cond.is || subject.school === "prismatic")
      );
    case "slot":
      return slotMatches(ctx.scope?.slotId, cond.is);
    case "valueGte":
      return subject !== null && subject.value >= cond.n;
    case "valueLt":
      return subject !== null && subject.value < cond.n;
    case "isMaxFace":
      return subject !== null && subject.value >= dieFaceMax(subject);
    case "isMinFace":
      return subject !== null && subject.value <= dieFaceMin(subject);
    case "equalsLast":
      return (
        subject !== null &&
        subject.lastValue !== undefined &&
        subject.value === subject.lastValue
      );
    case "resonanceAtLeast":
      return ctx.resAtLeast(cond.school, cond.n);
    case "flag":
      return ctx.flags.has(cond.key);
  }
};

const condsMatch = (
  conds: readonly Cond[] | undefined,
  ctx: BattleCtx,
  subject: RolledDie | null,
): boolean => {
  if (conds === undefined) return true;
  return conds.every((cond) => condMatches(cond, ctx, subject));
};

const applyAction = (
  action: Action,
  ctx: BattleCtx,
  subject: RolledDie | null,
): void => {
  switch (action.a) {
    case "dmg":
      ctx.dmg(action.n, action.target);
      return;
    case "shield":
      ctx.shield(action.n);
      return;
    case "heal":
      ctx.heal(action.n);
      return;
    case "charge":
      ctx.charge(action.n);
      return;
    case "modDieValue":
      if (subject !== null) ctx.modDieValue(subject, action.n);
      return;
    case "setDieValue":
      if (subject !== null) ctx.setDieValue(subject, action.n);
      return;
    case "addStatus":
      ctx.addStatus(action.s, action.n, action.target);
      return;
    case "scrap":
      ctx.scrap(action.n);
      return;
    case "hull":
      ctx.hull(action.n);
      return;
    case "primeSchool":
      ctx.primeSchool(action.school, action.n ?? 0, action.max ?? false);
      return;
    case "allowExceedCap":
      ctx.log("allowExceedCap");
      return;
    case "repeatSlot":
      ctx.requestRepeat();
      return;
    case "extraReroll":
      ctx.log(`extraReroll ${String(action.n)}`);
      return;
    case "setFlag":
      ctx.flags.add(action.key);
      ctx.log(`setFlag ${action.key}`);
      return;
    case "axis":
      ctx.log(`axis ${String(action.n)}`);
      return;
    case "tide":
      ctx.log(`tide ${String(action.n)}`);
      return;
  }
};

export const applyDefs = (
  effects: readonly EffectDef[],
  hook: Hook,
  ctx: BattleCtx,
  subject: RolledDie | null,
): void => {
  for (const def of effects) {
    if (def.on !== hook) continue;
    if (!condsMatch(def.if, ctx, subject)) continue;
    for (const action of def.do) applyAction(action, ctx, subject);
  }
};
