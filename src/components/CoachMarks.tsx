import { Button } from '@mantine/core';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ALL_COACH_MARK_IDS,
  nextCoachMark,
  type CoachMarkDef,
  type CoachRect,
} from '@/game/tutorial';
import { useAppStore } from '@/stores/appStore';
import type { ScreenId } from '@/types';
import { useMetaStore } from '@/stores/metaStore';
import styles from './CoachMarks.module.css';

const POLL_MS = 400;
const CARD_W = 300;
const CARD_H = 132;

const cardPosition = (rect: CoachRect): { left: number; top: number } => {
  const margin = 12;
  const below = rect.y + rect.h + margin;
  const fitsBelow = below + CARD_H < window.innerHeight;
  const top = fitsBelow ? below : Math.max(margin, rect.y - CARD_H - margin);
  const left = Math.min(
    Math.max(margin, rect.x + rect.w / 2 - CARD_W / 2),
    window.innerWidth - CARD_W - margin,
  );
  return { left, top };
};

interface MarkViewProps {
  mark: CoachMarkDef;
  rect: CoachRect;
  onNext: () => void;
  onSkipAll: () => void;
}

const MarkView = ({ mark, rect, onNext, onSkipAll }: MarkViewProps) => {
  const { t } = useTranslation(['run', 'common']);
  const { left, top } = cardPosition(rect);
  const w = window.innerWidth;
  const h = window.innerHeight;
  return (
    <div className={styles.root}>
      <div
        className={styles.dim}
        style={{ left: 0, top: 0, width: w, height: Math.max(0, rect.y) }}
      />
      <div
        className={styles.dim}
        style={{
          left: 0,
          top: rect.y + rect.h,
          width: w,
          height: Math.max(0, h - rect.y - rect.h),
        }}
      />
      <div
        className={styles.dim}
        style={{
          left: 0,
          top: rect.y,
          width: Math.max(0, rect.x),
          height: rect.h,
        }}
      />
      <div
        className={styles.dim}
        style={{
          left: rect.x + rect.w,
          top: rect.y,
          width: Math.max(0, w - rect.x - rect.w),
          height: rect.h,
        }}
      />
      <div
        className={styles.cutout}
        style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      />
      <div className={styles.card} style={{ left, top, width: CARD_W }}>
        <span className={styles.title}>{t(mark.title)}</span>
        <span className={styles.body}>{t(mark.body)}</span>
        <div className={styles.actions}>
          <Button size="compact-xs" variant="subtle" onClick={onSkipAll}>
            {t('run:tutorial.skipAll')}
          </Button>
          <Button size="compact-xs" onClick={onNext}>
            {t('run:tutorial.next')}
          </Button>
        </div>
      </div>
    </div>
  );
};

// The anchors live in Pixi and in freshly mounted DOM, so the host samples
// them on a timer rather than guessing when they exist. Remounting per screen
// (via the key below) is what clears a stale mark on navigation.
const CoachMarkHost = ({ screen }: { screen: ScreenId }) => {
  const seen = useMetaStore((s) => s.tutorialSeen);
  const markSeen = useMetaStore((s) => s.markTutorialSeen);
  const [active, setActive] = useState<{
    mark: CoachMarkDef;
    rect: CoachRect;
  } | null>(null);

  useEffect(() => {
    const evaluate = (): void => {
      const mark = nextCoachMark(screen, useMetaStore.getState().tutorialSeen);
      const rect = mark?.anchor() ?? null;
      if (mark === null || rect === null) {
        setActive((prev) => (prev === null ? prev : null));
        return;
      }
      setActive((prev) =>
        prev !== null && prev.mark.id === mark.id && prev.rect.x === rect.x
          ? prev
          : { mark, rect },
      );
    };
    const first = window.setTimeout(evaluate, 0);
    const id = window.setInterval(evaluate, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [screen, seen]);

  if (active === null) return null;

  return (
    <MarkView
      mark={active.mark}
      rect={active.rect}
      onNext={() => {
        setActive(null);
        markSeen(active.mark.id);
      }}
      onSkipAll={() => {
        setActive(null);
        for (const id of ALL_COACH_MARK_IDS) markSeen(id);
      }}
    />
  );
};

export const CoachMarks = () => {
  const screen = useAppStore((s) => s.screen);
  return <CoachMarkHost key={screen} screen={screen} />;
};
