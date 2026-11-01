import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRollSettings } from '@/app/rollSettings';
import { openTapLayer } from '@/app/tapLayer';
import { DiceRollOverlay } from '@/components/DiceRollOverlay';
import { FATE_DIE_ID, fateOutcomeFor } from '@/data/fate';
import { duckMusic, playSfx } from '@/services/audio';
import { deriveSeed } from '@/services/rng';
import { haptic } from '@/services/tma';
import { useBattleStore } from '@/stores/battleStore';
import styles from './FateInvocation.module.css';

const GLYPHS = ['I', 'V', 'X', 'L', 'C', 'D'] as const;
const ORBIT_RADIUS = 72;
const FATE_DIE_SIZE = 96;
const HOLD_MS = 1800;

interface Shown {
  use: number;
  roll: number;
}

export const FateInvocation = () => {
  const { t } = useTranslation(['battle', 'content']);
  const fateUses = useBattleStore((s) => s.fateUses);
  const fateRoll = useBattleStore((s) => s.fateRoll);
  const roll = useRollSettings();
  const [shown, setShown] = useState<Shown | null>(null);
  const [settled, setSettled] = useState(false);
  const [skippedUse, setSkippedUse] = useState<number | null>(null);
  const prevUses = useRef(fateUses);

  useEffect(() => {
    const grew = fateUses > prevUses.current;
    prevUses.current = fateUses;
    if (!grew || fateRoll === null) return;
    playSfx('thresholdHold', { gain: 0.55 });
    playSfx('surge');
    duckMusic(1200);
    haptic('reveal');
    setSettled(false);
    setSkippedUse(null);
    setShown({ use: fateUses, roll: fateRoll });
  }, [fateUses, fateRoll]);

  useEffect(() => {
    if (!settled) return;
    const id = window.setTimeout(() => {
      setShown(null);
      setSettled(false);
    }, HOLD_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [settled]);

  const showing = shown !== null;
  useLayoutEffect(() => (showing ? openTapLayer() : undefined), [showing]);

  if (shown === null) return null;
  const outcome = fateOutcomeFor(shown.roll);

  return (
    <div
      className={styles.overlay}
      data-testid="fate-invocation"
      data-fate-band={outcome.band}
      onClick={() => {
        if (!settled) {
          setSkippedUse(shown.use);
          return;
        }
        setShown(null);
        setSettled(false);
      }}
    >
      {roll.reduced ? null : (
        <div className={styles.orbit}>
          {GLYPHS.map((glyph, i) => {
            const angle = (i / GLYPHS.length) * Math.PI * 2;
            return (
              <span
                key={glyph}
                className={styles.glyph}
                style={{
                  left: Math.cos(angle) * ORBIT_RADIUS,
                  top: Math.sin(angle) * ORBIT_RADIUS,
                }}
              >
                {glyph}
              </span>
            );
          })}
        </div>
      )}
      <div className={styles.stage}>
        <DiceRollOverlay
          key={shown.use}
          dice={[{ key: 'fate', defId: FATE_DIE_ID, tier: 100, value: shown.roll, school: 'grey' }]}
          seed={deriveSeed(shown.roll, `fate:${String(shown.use)}`)}
          style={roll.style}
          durationMs={roll.durationMs}
          reduced={roll.reduced}
          size={FATE_DIE_SIZE}
          skip={skippedUse === shown.use}
          testId="fate-roll"
          onSettled={() => {
            setSettled(true);
            playSfx(outcome.band === 'catastrophe' || outcome.band === 'setback' ? 'checkFail' : 'checkPass');
            haptic('resolveTick');
          }}
        >
          <p className={styles.result} data-fate-result={outcome.id}>
            {t('battle:fateResult', { roll: shown.roll, text: t(outcome.text) })}
          </p>
        </DiceRollOverlay>
      </div>
    </div>
  );
};
