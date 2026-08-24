import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/stores/appStore';
import { useBattleStore } from '@/stores/battleStore';
import { useNarrativeStore } from '@/stores/narrativeStore';
import styles from '@/screens/Battle/BattleScreen.module.css';

export const CheckBanner = () => {
  const { t } = useTranslation(['battle', 'content']);
  const steps = useBattleStore((s) => s.checkSteps);
  const index = useBattleStore((s) => s.checkIndex);
  const skipCheck = useBattleStore((s) => s.skipCheck);
  const go = useAppStore((s) => s.go);
  const step = steps?.[index];
  const freeLine = step?.moves === null ? step.sayKey : null;

  useEffect(() => {
    if (freeLine === null) return;
    useNarrativeStore.getState().pushHint(freeLine);
  }, [freeLine]);

  if (steps === null || step === undefined || step.moves === null) return null;
  return (
    <div
      className={styles.checkBanner}
      data-band="check"
      data-check-step={index + 1}
      data-testid="check-banner"
    >
      <span className={`${styles.pill ?? ''} ${styles.pillCharge ?? ''}`}>
        {t('battle:check.step', { cur: index + 1, max: steps.length })}
      </span>
      <span className={styles.checkSay}>{t(step.sayKey)}</span>
      {index === 0 ? null : (
        <button
          type="button"
          className={styles.checkSkip}
          data-testid="check-skip"
          onClick={() => {
            const store = useBattleStore.getState();
            const sandbox = store.checkSandbox;
            skipCheck();
            if (!sandbox) return;
            store.reset();
            go('codex');
          }}
        >
          {t('battle:check.skip')}
        </button>
      )}
    </div>
  );
};
