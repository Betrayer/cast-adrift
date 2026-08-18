import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { ACHIEVEMENT_BY_ID } from '@/data/achievements';
import { playSfx } from '@/services/audio';
import { SUPPORT_EMAIL } from '@/services/support';
import { haptic } from '@/services/tma';
import { useAppStore } from '@/stores/appStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import { useSettingsStore } from '@/stores/settingsStore';
import styles from './ToastHost.module.css';

const CONSEQUENCE_MS = 4000;
const BARK_MS = 3500;
const ACHIEVEMENT_MS = 4500;
const AUTH_MS = 6000;
const HINT_MS = 7000;

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
    playSfx('consequenceChime');
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
  const verbosity = useSettingsStore((s) => s.echoVerbosity);

  useEffect(() => {
    if (bark === null) return;
    if (verbosity === 'normal') {
      playSfx('barkChime', { gain: queued > 0 ? 0.45 : 1 });
    }
    const id = window.setTimeout(dismiss, BARK_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [bark, dismiss, verbosity, queued]);

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

const AchievementSlot = () => {
  const { t } = useTranslation(['meta']);
  const toast = useNarrativeStore((s) => s.achievement);
  const queued = useNarrativeStore((s) => s.achievementQueue.length);
  const dismiss = useNarrativeStore((s) => s.dismissAchievement);

  useEffect(() => {
    if (toast === null) return;
    playSfx('achievement');
    haptic('achievement');
    const id = window.setTimeout(dismiss, ACHIEVEMENT_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [toast, dismiss]);

  if (toast === null) return <div className={styles.slot} />;
  const def = ACHIEVEMENT_BY_ID.get(toast.achievement);
  return (
    <div className={styles.slot}>
      <div
        role="status"
        data-toast="achievement"
        onClick={dismiss}
        className={`${styles.toast ?? ''} ${styles.achievement ?? ''}`}
      >
        <span className={styles.achievementMark}>✦</span>
        <span className={styles.achievementLabel}>
          <span className={styles.achievementKicker}>
            {t('meta:ach.toast')}
          </span>
          <span>{t(def?.name ?? toast.achievement)}</span>
        </span>
      </div>
      <QueueDots count={queued} />
    </div>
  );
};

const AuthSlot = () => {
  const { t } = useTranslation(['settings']);
  const error = useAppStore((s) => s.authError);
  const screen = useAppStore((s) => s.screen);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const visible = error !== null && error !== dismissed && screen !== 'settings';

  useEffect(() => {
    if (!visible) return;
    const id = window.setTimeout(() => {
      setDismissed(error);
    }, AUTH_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [visible, error]);

  if (!visible) return <div className={styles.slot} />;
  return (
    <div className={styles.slot}>
      <div
        role="status"
        data-toast="auth"
        className={`${styles.toast ?? ''} ${styles.auth ?? ''}`}
      >
        {t(`settings:account.error.${error ?? 'unknown'}`, {
          email: SUPPORT_EMAIL,
        })}
      </div>
    </div>
  );
};

const HintSlot = () => {
  const { t } = useTranslation(['battle']);
  const hint = useNarrativeStore((s) => s.hint);
  const dismiss = useNarrativeStore((s) => s.dismissHint);

  useEffect(() => {
    if (hint === null) return;
    const id = window.setTimeout(dismiss, HINT_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [hint, dismiss]);

  if (hint === null) return <div className={styles.slot} />;
  return (
    <div className={styles.slot}>
      <div
        role="status"
        data-toast="hint"
        onClick={dismiss}
        className={`${styles.toast ?? ''} ${styles.hint ?? ''}`}
      >
        {t(hint.line)}
      </div>
    </div>
  );
};

const JournalTick = () => {
  const entries = useNarrativeStore((s) => s.journal.length);
  const previous = useRef(entries);

  useEffect(() => {
    if (entries > previous.current) playSfx('journalStamp');
    previous.current = entries;
  }, [entries]);

  return null;
};

export const ToastHost = () => {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className={styles.host} data-toast-host>
      <JournalTick />
      <ConsequenceSlot />
      <AuthSlot />
      <HintSlot />
      <AchievementSlot />
      <BarkSlot />
    </div>,
    document.body,
  );
};
