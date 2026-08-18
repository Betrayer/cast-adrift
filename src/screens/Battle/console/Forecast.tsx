import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { enemyForecast } from '@/game/battle/view';
import { battleSnapshot, useBattleStore } from '@/stores/battleStore';
import styles from './Console.module.css';

export const Forecast = () => {
  const { t } = useTranslation(['battle']);
  const board = useBattleStore();

  const forecast = useMemo(
    () =>
      board.phase === 'placement'
        ? enemyForecast(battleSnapshot(board))
        : null,
    [board],
  );

  return (
    <div
      className={`${styles.forecast ?? ''} ${
        forecast?.lethal === true ? styles.forecastLethal ?? '' : ''
      }`}
      data-forecast
    >
      {forecast === null
        ? ''
        : forecast.ends === 'victory'
          ? t('battle:forecastClear', { out: forecast.outgoing })
          : t('battle:forecast', {
              out: forecast.outgoing,
              inc: forecast.toHull,
              shield: forecast.toShield,
            })}
    </div>
  );
};
