import { MIRROR_CAP, MIRROR_SCHOOL_CAP } from '@/game/battle/resolver';
import type { Intent } from '@/types/content';

export const intentVars = (intent: Intent): Record<string, number> => {
  switch (intent.t) {
    case 'multi':
      return { n: intent.n, k: intent.k, total: intent.n * intent.k };
    case 'bargain':
      return { n: intent.n, heal: intent.heal };
    case 'echoTotal':
      return { n: intent.cap };
    case 'jamSlot':
      return { n: intent.k ?? 1 };
    case 'mirrorHalf':
      return { cap: MIRROR_CAP };
    case 'mirrorSchool':
      return { cap: MIRROR_SCHOOL_CAP };
    default:
      return 'n' in intent ? { n: intent.n } : {};
  }
};
