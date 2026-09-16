import type { TFunction } from 'i18next';
import type { Intent, PartDeathEffect, SubsystemAura } from '@/types/content';
import { intentVars } from './intentVars';

export const intentExplain = (
  t: TFunction<['battle', 'content']>,
  intent: Intent,
): string => {
  if (intent.t === 'attack' && (intent.self ?? 0) > 0) {
    return t('battle:intentWhy.attackSelf', { n: intent.n, self: intent.self });
  }
  if (intent.t === 'lockDie' && intent.target === 'highest') {
    return t('battle:intentWhy.lockDieHighest');
  }
  return t(`battle:intentWhy.${intent.t}`, intentVars(intent));
};

export const auraExplain = (
  t: TFunction<['battle', 'content']>,
  aura: SubsystemAura,
): string => t(`battle:aura.${aura}`);

export const partDeathExplain = (
  t: TFunction<['battle', 'content']>,
  onDeath: PartDeathEffect,
): string => {
  switch (onDeath.t) {
    case 'explodePart':
      return t('battle:partDeath.explodePart', { n: onDeath.n });
    case 'enrageCore':
      return t('battle:partDeath.enrageCore', { n: onDeath.n });
    case 'openCore':
      return t('battle:partDeath.openCore', { turns: onDeath.turns });
    case 'shieldCore':
      return t('battle:partDeath.shieldCore', { n: onDeath.n });
    case 'spawnAdds':
      return t('battle:partDeath.spawnAdds');
  }
};
