import { useTranslation } from 'react-i18next';
import { useRotateGate } from '@/app/breakpoints';
import styles from './RotateGate.module.css';

export const RotateGate = () => {
  const { t } = useTranslation(['common']);
  const blocked = useRotateGate();
  if (!blocked) return null;
  return (
    <div className={styles.gate} role="alertdialog" data-rotate-gate>
      <svg
        className={styles.glyph}
        width="56"
        height="84"
        viewBox="0 0 56 84"
        aria-hidden="true"
      >
        <rect
          x="4"
          y="4"
          width="48"
          height="76"
          rx="8"
          fill="none"
          stroke="var(--ca-accent)"
          strokeWidth="3"
        />
        <line
          x1="20"
          y1="70"
          x2="36"
          y2="70"
          stroke="var(--ca-accent)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className={styles.title}>{t('common:rotate.title')}</span>
      <span className={styles.body}>{t('common:rotate.body')}</span>
    </div>
  );
};
