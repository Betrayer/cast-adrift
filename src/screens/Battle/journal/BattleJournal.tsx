import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ENEMY_BY_ID } from '@/data/enemies';
import { logTurns } from '@/game/battle/log';
import { useBattleStore } from '@/stores/battleStore';
import type { BattleLogEntry } from '@/types/battle';
import styles from './BattleJournal.module.css';

const actorKey = (entry: BattleLogEntry): string =>
  entry.side === 'you'
    ? `battle:slot.${entry.actor}`
    : ENEMY_BY_ID.get(entry.actor)?.name ?? `content:enemies.${entry.actor}`;

export const BattleJournal = () => {
  const { t } = useTranslation(['battle', 'content']);
  const log = useBattleStore((s) => s.log);
  const turns = useMemo(() => [...logTurns(log)].reverse(), [log]);

  return (
    <section className={styles.panel} data-battle-journal>
      <h2 className={styles.title}>{t('battle:journal.title')}</h2>
      {turns.length === 0 ? (
        <p className={styles.empty} data-journal-empty>
          {t('battle:journal.empty')}
        </p>
      ) : (
        <ol className={styles.turns}>
          {turns.map((group) => (
            <li key={group.turn} className={styles.turn}>
              <span className={styles.turnHead}>
                {t('battle:journal.turn', { n: group.turn })}
              </span>
              {group.entries.map((entry) => (
                <span
                  key={entry.id}
                  className={`${styles.row ?? ''} ${
                    entry.side === 'foe' ? styles.rowFoe ?? '' : ''
                  }`}
                  data-journal-side={entry.side}
                  data-journal-kind={entry.kind}
                >
                  <span className={styles.actor}>{t(actorKey(entry))}</span>
                  <span className={styles.what}>
                    {t(`battle:journal.${entry.side}.${entry.kind}`, {
                      n: entry.amount,
                    })}
                  </span>
                  {entry.hull > 0 ? (
                    <span className={styles.hull}>
                      {t('battle:journal.hull', { n: entry.hull })}
                    </span>
                  ) : null}
                  {entry.shield > 0 ? (
                    <span className={styles.shield}>
                      {t('battle:journal.shieldHit', { n: entry.shield })}
                    </span>
                  ) : null}
                  {entry.dodged > 0 ? (
                    <span className={styles.evaded}>
                      {t('battle:journal.dodged', { n: entry.dodged })}
                    </span>
                  ) : null}
                  {entry.glanced > 0 ? (
                    <span className={styles.evaded}>
                      {t('battle:journal.glanced', { n: entry.glanced })}
                    </span>
                  ) : null}
                </span>
              ))}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
