import type { TFunction } from 'i18next';
import { MIRROR_CAP, MIRROR_SCHOOL_CAP } from '@/game/battle/resolver';
import type { Intent, SubsystemAura } from '@/types/content';

export const intentExplain = (
  t: TFunction<['battle', 'content']>,
  intent: Intent,
): string => {
  switch (intent.t) {
    case 'attack':
      return (intent.self ?? 0) > 0
        ? t('battle:intentWhy.attackSelf', { n: intent.n, self: intent.self })
        : t('battle:intentWhy.attack', { n: intent.n });
    case 'shield':
      return t('battle:intentWhy.shield', { n: intent.n });
    case 'shieldAll':
      return t('battle:intentWhy.shieldAll', { n: intent.n });
    case 'multi':
      return t('battle:intentWhy.multi', {
        n: intent.n,
        k: intent.k,
        total: intent.n * intent.k,
      });
    case 'charge':
      return t('battle:intentWhy.charge');
    case 'jamSlot':
      return t('battle:intentWhy.jamSlot', { n: intent.k ?? 1 });
    case 'lockDie':
      return intent.target === 'highest'
        ? t('battle:intentWhy.lockDieHighest')
        : t('battle:intentWhy.lockDie');
    case 'summon':
      return t('battle:intentWhy.summon');
    case 'healAllies':
      return t('battle:intentWhy.healAllies', { n: intent.n });
    case 'mirrorHalf':
      return t('battle:intentWhy.mirrorHalf', { cap: MIRROR_CAP });
    case 'stealScrap':
      return t('battle:intentWhy.stealScrap', { n: intent.n });
    case 'capShrink':
      return t('battle:intentWhy.capShrink');
    case 'twistDie':
      return t('battle:intentWhy.twistDie');
    case 'swapValues':
      return t('battle:intentWhy.swapValues');
    case 'storm':
      return t('battle:intentWhy.storm');
    case 'curseDie':
      return t('battle:intentWhy.curseDie', { n: intent.n });
    case 'shieldGate':
      return t('battle:intentWhy.shieldGate', { n: intent.n });
    case 'mirrorSchool':
      return t('battle:intentWhy.mirrorSchool', { cap: MIRROR_SCHOOL_CAP });
    case 'drainCharge':
      return t('battle:intentWhy.drainCharge', { n: intent.n });
    case 'siphonShield':
      return t('battle:intentWhy.siphonShield', { n: intent.n });
    case 'bargain':
      return t('battle:intentWhy.bargain', { n: intent.n, heal: intent.heal });
    case 'enrage':
      return t('battle:intentWhy.enrage', { n: intent.n });
    case 'hijack':
      return t('battle:intentWhy.hijack');
    case 'echoTotal':
      return t('battle:intentWhy.echoTotal', { n: intent.cap });
    case 'foldOrder':
      return t('battle:intentWhy.foldOrder');
    case 'devourDie':
      return t('battle:intentWhy.devourDie');
  }
};

export const auraExplain = (
  t: TFunction<['battle', 'content']>,
  aura: SubsystemAura,
): string => t(`battle:aura.${aura}`);
