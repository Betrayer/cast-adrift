import { echoStepReadout, type EchoStepReadout } from '@/data/echo';
import { patternFor } from '@/game/battle/setup';
import type { EnemyDef, Intent } from '@/types/content';
import type { EnemyState } from '@/types/battle';

export type EchoReadout =
  | { kind: 'fork'; fork: EchoStepReadout }
  | { kind: 'fixed'; intent: Intent }
  | { kind: 'open' };

export const echoReadoutFor = (
  def: EnemyDef,
  enemy: Pick<EnemyState, 'intentIndex' | 'phase'>,
  ascension: number,
): EchoReadout | null => {
  const pattern = patternFor(def, enemy.phase, ascension);
  if (pattern.length === 0) return null;
  const step = pattern[(enemy.intentIndex + 1) % pattern.length];
  if (step === undefined) return null;
  if ('when' in step) {
    const fork = echoStepReadout(step);
    return fork === null ? null : { kind: 'fork', fork };
  }
  if ('pick' in step) return { kind: 'open' };
  return { kind: 'fixed', intent: step };
};
