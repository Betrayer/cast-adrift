import type { TFunction } from 'i18next';
import type { Intent } from '@/types/content';

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
): string => {
  switch (intent.t) {
    case 'attack':
      return t('battle:intent.attack', { n: intent.n });
    case 'shield':
      return t('battle:intent.shield', { n: intent.n });
    case 'shieldAll':
      return t('battle:intent.shieldAll', { n: intent.n });
    case 'multi':
      return t('battle:intent.multi', { n: intent.n, k: intent.k });
    case 'charge':
      return t('battle:intent.charge');
    case 'jamSlot':
      return t('battle:intent.jamSlot');
    case 'lockDie':
      return t('battle:intent.lockDie');
    case 'summon':
      return t('battle:intent.summon');
    case 'healAllies':
      return t('battle:intent.healAllies', { n: intent.n });
    case 'mirrorHalf':
      return t('battle:intent.mirrorHalf');
    case 'stealScrap':
      return t('battle:intent.stealScrap', { n: intent.n });
    case 'capShrink':
      return t('battle:intent.capShrink');
    case 'twistDie':
      return t('battle:intent.twistDie');
    case 'swapValues':
      return t('battle:intent.swapValues');
    case 'storm':
      return t('battle:intent.storm');
    case 'curseDie':
      return t('battle:intent.curseDie', { n: intent.n });
    case 'shieldGate':
      return t('battle:intent.shieldGate', { n: intent.n });
    case 'mirrorSchool':
      return t('battle:intent.mirrorSchool');
    case 'drainCharge':
      return t('battle:intent.drainCharge', { n: intent.n });
    case 'siphonShield':
      return t('battle:intent.siphonShield', { n: intent.n });
    case 'bargain':
      return t('battle:intent.bargain', { n: intent.n, heal: intent.heal });
    case 'enrage':
      return t('battle:intent.enrage', { n: intent.n });
    case 'hijack':
      return t('battle:intent.hijack');
    case 'echoTotal':
      return t('battle:intent.echoTotal', { n: intent.cap });
    case 'foldOrder':
      return t('battle:intent.foldOrder');
    case 'devourDie':
      return t('battle:intent.devourDie');
  }
};
