import { useEffect, useRef, useState } from 'react';
import { duckMusic, playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { resolveReducedMotion, useSettingsStore } from '@/stores/settingsStore';
import { useBattleStore } from '@/stores/battleStore';
import styles from './FateInvocation.module.css';

const DURATION_MS = 600;
const GLYPHS = ['I', 'V', 'X', 'L', 'C', 'D'] as const;
const ORBIT_RADIUS = 72;

// DESIGN §7: rolling Fate is a ceremony, not a button press — the board dims
// and the numeral ring turns once before the verdict is read.
export const FateInvocation = () => {
  const fateUses = useBattleStore((s) => s.fateUses);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  const [visible, setVisible] = useState(false);
  const prevUses = useRef(fateUses);

  useEffect(() => {
    const grew = fateUses > prevUses.current;
    prevUses.current = fateUses;
    if (!grew) return;
    playSfx('thresholdHold', { gain: 0.55 });
    playSfx('surge');
    duckMusic(1200);
    haptic('reveal');
    setVisible(true);
    const id = window.setTimeout(
      () => {
        setVisible(false);
      },
      reduced ? 220 : DURATION_MS,
    );
    return () => {
      window.clearTimeout(id);
    };
  }, [fateUses, reduced]);

  if (!visible) return null;
  if (reduced) return <div className={styles.still} />;

  return (
    <div className={styles.overlay}>
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
    </div>
  );
};
