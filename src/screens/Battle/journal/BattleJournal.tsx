import { useTranslation } from 'react-i18next';
import { BattleLogList } from '@/screens/Battle/journal/BattleLogList';
import { useBattleStore } from '@/stores/battleStore';
import styles from './BattleJournal.module.css';

export const BattleJournal = () => {
  const { t } = useTranslation(['battle']);
  const log = useBattleStore((s) => s.log);

  return (
    <section className={styles.panel} data-battle-journal>
      <h2 className={styles.title}>{t('battle:journal.title')}</h2>
      <BattleLogList log={log} />
    </section>
  );
};
