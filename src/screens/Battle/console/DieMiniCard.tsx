import { useTranslation } from 'react-i18next';
import { DieCard } from '@/components/DieCard';
import { useBattleStore } from '@/stores/battleStore';
import styles from './Console.module.css';

export const DieMiniCard = ({ compact = false }: { compact?: boolean }) => {
  const { t } = useTranslation(['battle', 'content']);
  const selectedDieUid = useBattleStore((s) => s.selectedDieUid);
  const dice = useBattleStore((s) => s.dice);
  const engravings = useBattleStore((s) => s.engravings);
  const die = dice.find((d) => d.uid === selectedDieUid);

  if (die === undefined) {
    return (
      <div
        className={`${styles.mini ?? ''} ${compact ? styles.miniCompact ?? '' : ''}`}
        data-die-card="none"
      >
        <span className={styles.miniHint}>{t('battle:pickDie')}</span>
      </div>
    );
  }

  return (
    <DieCard
      defId={die.defId}
      size="mini"
      dense={compact}
      growthBonus={die.growth ?? 0}
      engravings={engravings}
    />
  );
};
