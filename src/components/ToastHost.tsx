import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useNarrativeStore } from '@/stores/narrativeStore';
import styles from './ToastHost.module.css';

const CONSEQUENCE_MS = 4000;
const BARK_MS = 3500;

const QueueDots = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  return (
    <div className={styles.queue}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={styles.queueDot} />
      ))}
    </div>
  );
};

const ConsequenceSlot = () => {
  const { t } = useTranslation(['run', 'content']);
  const consequence = useNarrativeStore((s) => s.consequence);
  const queued = useNarrativeStore((s) => s.consequenceQueue.length);
  const dismiss = useNarrativeStore((s) => s.dismissConsequence);

  useEffect(() => {
    if (consequence === null) return;
    const id = window.setTimeout(dismiss, CONSEQUENCE_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [consequence, dismiss]);

  if (consequence === null) return <div className={styles.slot} />;
  return (
    <div className={styles.slot}>
      <div
        role="status"
        data-toast="consequence"
        onClick={dismiss}
        className={`${styles.toast ?? ''} ${styles.consequence ?? ''}`}
      >
        {t('run:consequenceToast', { text: t(consequence.origin) })}
      </div>
      <QueueDots count={queued} />
    </div>
  );
};

const BarkSlot = () => {
  const { t } = useTranslation(['content']);
  const bark = useNarrativeStore((s) => s.bark);
  const queued = useNarrativeStore((s) => s.barkQueue.length);
  const dismiss = useNarrativeStore((s) => s.dismissBark);

  useEffect(() => {
    if (bark === null) return;
    const id = window.setTimeout(dismiss, BARK_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [bark, dismiss]);

  if (bark === null) return <div className={styles.slot} />;
  return (
    <div className={styles.slot}>
      <QueueDots count={queued} />
      <div
        role="status"
        data-toast="bark"
        onClick={dismiss}
        className={`${styles.toast ?? ''} ${styles.bark ?? ''}`}
      >
        <span className={styles.barkMark}>◆</span>
        <span>{t(bark.line)}</span>
      </div>
    </div>
  );
};

export const ToastHost = () => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={styles.host} data-toast-host>
      <ConsequenceSlot />
      <BarkSlot />
    </div>,
    document.body,
  );
};
