import { useTranslation } from 'react-i18next';
import { useTurnForecast } from '@/screens/Battle/shell/useTurnForecast';
import styles from './Tablet.module.css';

export const ForecastStrip = () => {
  const { t } = useTranslation(['battle']);
  const forecast = useTurnForecast();

  if (forecast === null) {
    return <div className={styles.strip} data-forecast-strip />;
  }
  if (forecast.ends === 'victory') {
    return (
      <div
        className={`${styles.strip ?? ''} ${styles.stripClear ?? ''}`}
        data-forecast-strip
        data-forecast-state="clear"
      >
        {t('battle:forecastClear', { out: forecast.outgoing })}
      </div>
    );
  }
  const evade = Math.max(0, forecast.raw - forecast.incoming);
  return (
    <div
      className={`${styles.strip ?? ''} ${
        forecast.lethal ? styles.stripLethal ?? '' : ''
      }`}
      data-forecast-strip
      data-forecast-state={
        forecast.lethal ? 'lethal' : forecast.toHull > 0 ? 'hurt' : 'safe'
      }
    >
      <span className={styles.stripHead}>
        {t('battle:forecastStrip', {
          out: forecast.outgoing,
          hull: forecast.toHull,
        })}
      </span>
      <span className={styles.stripBreak}>
        {t('battle:forecastBreak', {
          raw: forecast.raw,
          evade,
          shield: forecast.toShield,
        })}
      </span>
    </div>
  );
};
