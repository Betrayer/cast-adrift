import { DIE_BY_ID } from "@/data/dice";
import { engravingEffects, type EngravingMap } from "@/data/engravings";
import { buildAffinitySource } from "@/game/effects/affinity";
import { buildChartSource } from "@/game/effects/chartSource";
import type { EffectCtx } from "@/game/effects/ctx";
import { applyDefs } from "@/game/effects/evaluate";
import { buildModuleSource } from "@/game/effects/moduleSource";
import { buildPerkSource } from "@/game/effects/perkSource";
import { buildResonanceSource } from "@/game/effects/resonanceSource";
import {
  SUBJECT_HOOKS,
  type EffectDef,
  type Hook,
} from "@/game/effects/types";
import type { BattleSnapshot, RolledDie } from "@/types/battle";

export interface EffectSource {
  key: string;
  dieUid?: string;
  run: (hook: Hook, ctx: EffectCtx, subject: RolledDie | null) => void;
}

export interface RunLoadout {
  perks: readonly string[];
  chartPicks: readonly string[];
  modules: readonly string[];
  deckDefIds: readonly string[];
  engravings?: EngravingMap;
}

const subjectHooks: ReadonlySet<Hook> = new Set(SUBJECT_HOOKS);

const injected: EffectSource[] = [];

export const injectEffectSource = (source: EffectSource): (() => void) => {
  injected.push(source);
  return () => {
    const index = injected.indexOf(source);
    if (index >= 0) injected.splice(index, 1);
  };
};

const defsSource = (
  key: string,
  effects: readonly EffectDef[],
  dieUid?: string,
): EffectSource => ({
  key,
  ...(dieUid === undefined ? {} : { dieUid }),
  run: (hook, ctx, subject) => {
    applyDefs(effects, hook, ctx, subject);
  },
});

const dieDefEffects = (
  defId: string,
  engravings: EngravingMap | undefined,
): EffectDef[] => [
  ...(DIE_BY_ID.get(defId)?.effects ?? []),
  ...engravingEffects(engravings, defId),
];

export const buildSources = (snapshot: BattleSnapshot): EffectSource[] => {
  const sources: EffectSource[] = [
    buildAffinitySource(),
    buildResonanceSource(snapshot.resonance),
    buildPerkSource(snapshot.perks),
    buildChartSource(snapshot.chartPicks ?? []),
    buildModuleSource(snapshot.modules ?? []),
  ];
  for (const die of snapshot.dice) {
    const effects = dieDefEffects(die.defId, snapshot.engravings);
    if (effects.length > 0) {
      sources.push(defsSource(`die:${die.uid}`, effects, die.uid));
    }
  }
  return [...sources, ...injected];
};

export const buildRunSources = (loadout: RunLoadout): EffectSource[] => {
  const sources: EffectSource[] = [
    buildPerkSource(loadout.perks),
    buildChartSource(loadout.chartPicks),
    buildModuleSource(loadout.modules),
  ];
  loadout.deckDefIds.forEach((defId, index) => {
    const effects = dieDefEffects(defId, loadout.engravings);
    if (effects.length > 0) {
      sources.push(defsSource(`dieDef:${defId}:${String(index)}`, effects));
    }
  });
  return [...sources, ...injected];
};

export const emit = (
  sources: readonly EffectSource[],
  hook: Hook,
  ctx: EffectCtx,
): void => {
  const subject = ctx.subject?.() ?? null;
  for (const source of sources) {
    if (source.dieUid === undefined) {
      source.run(hook, ctx, subject);
      continue;
    }
    const die = ctx.findDie?.(source.dieUid);
    if (die === undefined) continue;
    if (subjectHooks.has(hook) && subject?.uid !== die.uid) continue;
    source.run(hook, ctx, die);
  }
};
