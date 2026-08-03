import { Button, Text } from '@mantine/core';
import { useEffect, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { rarityColor } from '@/app/rarity';
import { tokens } from '@/app/theme';
import { DIE_BY_ID } from '@/data/dice';
import { LOOT_SFX } from '@/data/audio';
import { schools } from '@/data/schools';
import { duckMusic, playSfx } from '@/services/audio';
import { haptic } from '@/services/tma';
import { resolveReducedMotion, useSettingsStore } from '@/stores/settingsStore';
import { useLootStore } from '@/stores/lootStore';
import styles from './LootReveal.module.css';

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
    haptic('reveal');
    const def = DIE_BY_ID.get(dieId);
    if (def !== undefined) {
      playSfx(LOOT_SFX[def.rarity]);
      duckMusic(def.rarity === 'legendary' ? 2000 : 1200);
    }
    if (reduced) return;
    const id = window.setTimeout(() => {
      setRevealed(true);
    }, 60);
    return () => {
      window.clearTimeout(id);
    };
  }, [reduced, dieId]);

  const def = DIE_BY_ID.get(dieId);
  if (def === undefined) return null;

  const colors = schools[def.school];
  const frameColor = rarityColor(def.rarity);

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
      {revealed && !reduced && def.rarity === 'legendary' ? (
        <div className={styles.beam} style={{ color: frameColor }} />
      ) : null}
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
