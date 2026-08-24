import { useTranslation } from 'react-i18next';
import { useTurnForecast } from '@/screens/Battle/shell/useTurnForecast';
import styles from './Console.module.css';

export const Forecast = () => {
  const { t } = useTranslation(['battle']);
  const forecast = useTurnForecast();

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
