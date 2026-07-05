import { Button, Text } from '@mantine/core';
import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/app/theme';
import { DIE_BY_ID } from '@/data/dice';
import { schools } from '@/data/schools';
import { haptic } from '@/services/tma';
import { resolveReducedMotion, useSettingsStore } from '@/stores/settingsStore';
import { useLootStore } from '@/stores/lootStore';
import type { Rarity } from '@/types/content';
import styles from './LootReveal.module.css';

const RARITY_FRAME: Record<Rarity, string> = {
  common: tokens.line,
  uncommon: '#4A90E2',
  rare: '#B08CFF',
  legendary: '#E8B23A',
};

const BURST_DOTS = 8;
const BURST_RADIUS = 92;

const dotStyle = (index: number, color: string): CSSProperties => {
  const angle = (index / BURST_DOTS) * Math.PI * 2;
  const style: Record<string, string> = {
    background: color,
    '--tx': `${String(Math.cos(angle) * BURST_RADIUS)}px`,
    '--ty': `${String(Math.sin(angle) * BURST_RADIUS)}px`,
  };
  return style as CSSProperties;
};

interface LootCardProps {
  dieId: string;
  reduced: boolean;
  onClose: () => void;
}

const LootCard = ({ dieId, reduced, onClose }: LootCardProps) => {
  const { t } = useTranslation(['battle', 'content']);
  const [revealed, setRevealed] = useState(reduced);

  useEffect(() => {
    haptic('medium');
    if (reduced) return;
    const id = window.setTimeout(() => {
      setRevealed(true);
    }, 60);
    return () => {
      window.clearTimeout(id);
    };
  }, [reduced]);

  const def = DIE_BY_ID.get(dieId);
  if (def === undefined) return null;

  const colors = schools[def.school];
  const frameColor = RARITY_FRAME[def.rarity];

  const onOverlayClick = (): void => {
    if (!revealed) {
      setRevealed(true);
      return;
    }
    onClose();
  };

  return (
    <div
      className={styles.overlay}
      onClick={onOverlayClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOverlayClick();
      }}
    >
      <Text className={styles.title} c={tokens.dim}>
        {t('battle:lootNew')}
      </Text>
      <div className={styles.stage}>
        <div
          className={`${styles.card ?? ''} ${revealed ? styles.cardRevealed ?? '' : ''} ${reduced ? styles.cardInstant ?? '' : ''
            }`}
        >
          <div className={`${styles.face ?? ''} ${styles.back ?? ''}`}>
            <div className={styles.backMark} />
          </div>
          <div
            className={`${styles.face ?? ''} ${styles.front ?? ''} ${revealed ? styles.frontGlow ?? '' : ''
              }`}
            style={{ borderColor: frameColor, color: frameColor }}
          >
            <Text className={styles.dieName} c={tokens.text}>
              {t(def.name)}
            </Text>
            <Text className={styles.tier} c={tokens.dim}>
              {`d${String(def.tier)}`}
            </Text>
            <span
              className={styles.schoolChip}
              style={{ borderColor: colors.stroke, color: colors.text }}
            >
              {t(`battle:school.${def.school}`)}
            </span>
          </div>
          {revealed && !reduced ? (
            <div className={styles.burst}>
              {Array.from({ length: BURST_DOTS }, (_, i) => (
                <span
                  key={i}
                  className={styles.dot}
                  style={dotStyle(i, colors.stroke)}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <Button
        size="md"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        {t('battle:collect')}
      </Button>
    </div>
  );
};

export const LootReveal = () => {
  const pending = useLootStore((s) => s.pending);
  const clear = useLootStore((s) => s.clear);
  const reduced = resolveReducedMotion(
    useSettingsStore((s) => s.reducedMotion),
  );
  if (pending === null) return null;
  return (
    <LootCard key={pending} dieId={pending} reduced={reduced} onClose={clear} />
  );
};
