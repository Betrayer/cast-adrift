import { useTranslation } from 'react-i18next';
import { DIE_BY_ID } from '@/data/dice';
import { engravingsForDie } from '@/data/engravings';
import { FATE_DIE_ID } from '@/data/fate';
import { useBattleStore } from '@/stores/battleStore';
import type { RolledDie } from '@/types/battle';
import styles from './Console.module.css';

export type BadgeKind = 'active' | 'engraved' | 'growth' | 'faces' | 'fate';

export const BADGE_GLYPH: Record<BadgeKind, string> = {
  active: '◆',
  engraved: '⟡',
  growth: '+',
  faces: '▦',
  fate: '★',
};

export const badgesFor = (
  die: Pick<RolledDie, 'defId' | 'growth'>,
  engraved: boolean,
): BadgeKind[] => {
  const def = DIE_BY_ID.get(die.defId);
  const badges: BadgeKind[] = [];
  if (die.defId === FATE_DIE_ID) badges.push('fate');
  if (def?.active !== undefined) badges.push('active');
  if (engraved) badges.push('engraved');
  if ((die.growth ?? 0) > 0 || def?.growth !== undefined) badges.push('growth');
  if (def?.faces !== undefined && def.faces.length > 0) badges.push('faces');
  return badges;
};

export const DieMiniCard = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useTranslation(['battle', 'content']);
  const selectedDieUid = useBattleStore((s) => s.selectedDieUid);
  const dice = useBattleStore((s) => s.dice);
  const engravings = useBattleStore((s) => s.engravings);
  const die = dice.find((d) => d.uid === selectedDieUid);
  const def = die === undefined ? undefined : DIE_BY_ID.get(die.defId);

  if (die === undefined || def === undefined) {
    return (
      <div
        className={`${styles.mini ?? ''} ${compact ? styles.miniCompact ?? '' : ''}`}
        data-die-card="none"
      >
        <span className={styles.miniHint}>{t('battle:pickDie')}</span>
      </div>
    );
  }

  const engraved = engravingsForDie(engravings, die.defId).length > 0;
  const badges = badgesFor(die, engraved);
  const faces =
    def.faces !== undefined && def.faces.length > 0
      ? def.faces.join('·')
      : t('battle:dieFaces', { min: 1, max: def.tier });

  return (
    <div
      className={`${styles.mini ?? ''} ${compact ? styles.miniCompact ?? '' : ''}`}
      data-die-card={die.defId}
    >
      <span className={styles.miniHead} data-school={die.school}>
        {t(def.name)}
      </span>
      <span className={styles.miniMeta}>
        {t('battle:dieMeta', {
          tier: def.tier,
          school: t(`battle:school.${die.school}`),
          faces,
        })}
      </span>
      <span className={styles.miniDesc}>{def.desc === undefined ? '' : t(def.desc)}</span>
      {badges.length === 0 ? null : (
        <span className={styles.miniBadges} data-die-badges>
          {badges.map((badge) => (
            <span
              key={badge}
              className={styles.badge}
              data-badge={badge}
              title={t(`battle:badge.${badge}`)}
            >
              {badge === 'growth'
                ? `${BADGE_GLYPH.growth}${String(die.growth ?? 0)}`
                : BADGE_GLYPH[badge]}
            </span>
          ))}
        </span>
      )}
    </div>
  );
};
