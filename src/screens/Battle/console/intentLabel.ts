import type { TFunction } from 'i18next';
import type { Intent } from '@/types/content';
import { intentVars } from './intentVars';

export const ATTACK_INTENTS: ReadonlySet<Intent['t']> = new Set([
  'attack',
  'multi',
  'mirrorHalf',
  'mirrorSchool',
  'enrage',
  'echoTotal',
]);

export const intentLabel = (
  t: TFunction<['battle', 'content']>,
  intent: Intent,
): string => t(`battle:intent.${intent.t}`, intentVars(intent));
