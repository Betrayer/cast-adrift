import { ENEMY_BY_ID } from "@/data/enemies";
import { dieFaceMax, dieFaceMin } from "@/game/effects/context";
import type { EffectCtx } from "@/game/effects/ctx";
import type { ContentTag } from "@/data/tags";
import type {
  Action,
  Cond,
  DieSelector,
  EffectDef,
  Hook,
  SlotMatch,
} from "@/game/effects/types";
import type { EnemyState, RolledDie, SlotId } from "@/types/battle";

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

const enemyHpPct = (enemy: EnemyState): number =>
  enemy.hpMax > 0 ? (enemy.hp * 100) / enemy.hpMax : 0;

const condMatches = (
  cond: Cond,
  ctx: EffectCtx,
  subject: RolledDie | null,
): boolean => {
  switch (cond.c) {
    case "any":
      return cond.of.some((inner) => condMatches(inner, ctx, subject));
    case "not":
      return !condMatches(cond.of, ctx, subject);
    case "school":
      if (subject === null) return false;
      if (subject.school === cond.is) return true;
      return cond.exact !== true && subject.school === "prismatic";
    case "slot":
      return slotMatches(ctx.currentSlot?.(), cond.is);
    case "slotMk":
      return (ctx.slotMk?.(cond.slot) ?? 0) >= cond.n;
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
      return ctx.resAtLeast?.(cond.school, cond.n) ?? false;
    case "turnLte": {
      const turn = ctx.turn?.();
      return turn !== undefined && turn <= cond.n;
    }
    case "hullPctLt": {
      const pct = ctx.hullPct?.();
      return pct !== undefined && pct < cond.n;
    }
    case "flag":
      return ctx.hasFlag?.(cond.key) ?? false;
    case "firstOfTurn":
      return ctx.firstOfTurn?.() ?? false;
    case "chargeAtLeast":
      return (ctx.chargeValue?.() ?? 0) >= cond.n;
    case "shieldAtLeast":
      return (ctx.shieldValue?.() ?? 0) >= cond.n;
    case "tideAtLeast":
      return (ctx.tideValue?.() ?? 0) >= cond.n;
    case "inverted":
      return ctx.invertedOrder?.() ?? false;
    case "counterAtLeast":
      return (ctx.counter?.(cond.scope, cond.key) ?? 0) >= cond.n;
    case "enemyHpPctLt": {
      const enemy = ctx.targetEnemy?.();
      return enemy !== undefined && enemyHpPct(enemy) < cond.n;
    }
    case "enemyShielded": {
      const enemy = ctx.targetEnemy?.();
      return enemy !== undefined && enemy.shield > 0;
    }
    case "enemyHasStatus": {
      const enemy = ctx.targetEnemy?.();
      return enemy !== undefined && (enemy.statuses[cond.s] ?? 0) > 0;
    }
    case "enemyCountAtLeast":
      return (ctx.aliveEnemyCount?.() ?? 0) >= cond.n;
    case "targetIsBossOrMini": {
      const enemy = ctx.targetEnemy?.();
      if (enemy === undefined) return false;
      const def = ENEMY_BY_ID.get(enemy.defId);
      return def?.boss === true || def?.miniboss === true;
    }
    case "hasTag":
      return (ctx.tagCount?.(cond.tag) ?? 0) > 0;
    case "countTag":
      return (ctx.tagCount?.(cond.tag) ?? 0) >= cond.n;
    case "battleOutcome":
      return ctx.payload.battleEnd?.outcome === cond.is;
    case "nodeIs": {
      const node = ctx.payload.node;
      if (node === undefined) return false;
      return cond.is === "pocket" ? node.pocket : node.nodeType === cond.is;
    }
  }
};

const condsMatch = (
  conds: readonly Cond[] | undefined,
  ctx: EffectCtx,
  subject: RolledDie | null,
): boolean => {
  if (conds === undefined) return true;
  return conds.every((cond) => condMatches(cond, ctx, subject));
};

const PLACEABLE: ReadonlySet<RolledDie["state"]> = new Set(["tray", "placed"]);

const liveDice = (ctx: EffectCtx): readonly RolledDie[] =>
  (ctx.allDice?.() ?? []).filter((d) => PLACEABLE.has(d.state));

const selectDice = (
  sel: DieSelector | undefined,
  ctx: EffectCtx,
  subject: RolledDie | null,
): readonly RolledDie[] => {
  if (sel === undefined || sel.s === "subject") {
    return subject === null ? [] : [subject];
  }
  const dice = liveDice(ctx);
  switch (sel.s) {
    case "dieInSlot": {
      const found = dice.find((d) => d.slot === sel.slot);
      return found === undefined ? [] : [found];
    }
    case "lowestDie":
    case "highestDie": {
      if (dice.length === 0) return [];
      const best = dice.reduce((a, b) =>
        sel.s === "lowestDie"
          ? b.value < a.value
            ? b
            : a
          : b.value > a.value
            ? b
            : a,
      );
      return [best];
    }
    case "randomOther": {
      const others = dice.filter((d) => d.uid !== subject?.uid);
      const rng = ctx.rng?.();
      if (rng === undefined || others.length === 0) return [];
      return [rng.pick(others)];
    }
    case "allOfSchool":
      return dice.filter(
        (d) => d.school === sel.school || d.school === "prismatic",
      );
  }
};

const applyAction = (
  action: Action,
  ctx: EffectCtx,
  subject: RolledDie | null,
): void => {
  const scale = (n: number, perTag: ContentTag | undefined): number =>
    perTag === undefined ? n : n * (ctx.tagCount?.(perTag) ?? 0);
  switch (action.a) {
    case "dmg":
      ctx.dmg?.(scale(action.n, action.perTag), action.target);
      return;
    case "shield":
      ctx.shield?.(scale(action.n, action.perTag));
      return;
    case "heal":
      ctx.heal?.(scale(action.n, action.perTag));
      return;
    case "charge":
      ctx.charge?.(scale(action.n, action.perTag));
      return;
    case "modDieValue":
      for (const die of selectDice(action.sel, ctx, subject)) {
        ctx.modDieValue?.(die, action.n);
      }
      return;
    case "setDieValue":
      for (const die of selectDice(action.sel, ctx, subject)) {
        ctx.setDieValue?.(die, action.n);
      }
      return;
    case "rerollDie":
      for (const die of selectDice(action.sel, ctx, subject)) {
        ctx.rerollDie?.(die);
      }
      return;
    case "addStatus":
      ctx.addStatus?.(action.s, action.n, action.target);
      return;
    case "scrap":
      ctx.scrap?.(scale(action.n, action.perTag));
      return;
    case "hull":
      ctx.hull?.(scale(action.n, action.perTag));
      return;
    case "primeSchool":
      ctx.primeSchool?.(action.school, action.n ?? 0, action.max ?? false);
      return;
    case "allowExceedCap":
      ctx.allowExceedCap?.({
        ...(action.school === undefined ? {} : { school: action.school }),
        ...(action.slot === undefined ? {} : { slot: action.slot }),
        hullCost: action.hullCost ?? 1,
      });
      return;
    case "repeatSlot":
      ctx.requestRepeat?.();
      return;
    case "crit":
      ctx.setCrit?.();
      return;
    case "grow":
      for (const die of selectDice(undefined, ctx, subject)) {
        ctx.grow?.(die, action.n, action.cap);
      }
      return;
    case "grant":
      ctx.grant?.(action.what, action.n);
      return;
    case "counter":
      ctx.bumpCounter?.(action.scope, action.key, action.delta);
      return;
    case "schedule":
      ctx.schedule?.(action.on, action.turns ?? 1, action.do);
      return;
    case "addTempDie":
      ctx.addTempDie?.(action.defId, action.turns);
      return;
    case "removeTempDie":
      ctx.removeTempDice?.();
      return;
    case "setFlag":
      ctx.setFlag?.(action.key);
      return;
  }
};

export const applyActions = (
  actions: readonly Action[],
  ctx: EffectCtx,
  subject: RolledDie | null = null,
): void => {
  for (const action of actions) applyAction(action, ctx, subject);
};

export const applyDefs = (
  effects: readonly EffectDef[],
  hook: Hook,
  ctx: EffectCtx,
  subject: RolledDie | null,
): void => {
  for (const def of effects) {
    if (def.on !== hook) continue;
    if (!condsMatch(def.if, ctx, subject)) continue;
    applyActions(def.do, ctx, subject);
  }
};
