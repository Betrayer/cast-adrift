import { DIE_BY_ID } from "@/data/dice";
import { buildAffinitySource } from "@/game/effects/affinity";
import type { BattleCtx } from "@/game/effects/context";
import { applyDefs } from "@/game/effects/evaluate";
import { buildResonanceSource } from "@/game/effects/resonanceSource";
import type { EffectDef, Hook } from "@/game/effects/types";
import type { BattleSnapshot, RolledDie } from "@/types/battle";

export interface EffectSource {
  key: string;
  dieUid?: string;
  run: (hook: Hook, ctx: BattleCtx, subject: RolledDie | null) => void;
}

const SLOT_HOOKS: ReadonlySet<Hook> = new Set([
  "beforeResolveSlot",
  "afterResolveSlot",
  "place",
]);

const dieSource = (uid: string, effects: readonly EffectDef[]): EffectSource => ({
  key: `die:${uid}`,
  dieUid: uid,
  run: (hook, ctx, subject) => {
    applyDefs(effects, hook, ctx, subject);
  },
});

export const buildSources = (snapshot: BattleSnapshot): EffectSource[] => {
  const sources: EffectSource[] = [
    buildAffinitySource(),
    buildResonanceSource(snapshot.resonance),
  ];
  for (const die of snapshot.dice) {
    const effects = DIE_BY_ID.get(die.defId)?.effects;
    if (effects !== undefined && effects.length > 0) {
      sources.push(dieSource(die.uid, effects));
    }
  }
  return sources;
};

export const emit = (
  sources: readonly EffectSource[],
  hook: Hook,
  ctx: BattleCtx,
): void => {
  for (const source of sources) {
    let subject: RolledDie | null;
    if (source.dieUid !== undefined) {
      const die = ctx.findDie(source.dieUid);
      if (die === undefined) continue;
      if (SLOT_HOOKS.has(hook)) {
        if (ctx.scope === null || ctx.scope.die.uid !== die.uid) continue;
      } else if (hook === "rolled") {
        if (ctx.subjectDie === null || ctx.subjectDie.uid !== die.uid) continue;
      }
      subject = die;
    } else {
      subject = ctx.scope?.die ?? ctx.subjectDie ?? null;
    }
    source.run(hook, ctx, subject);
  }
};
