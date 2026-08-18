import { Button } from '@mantine/core';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { coachCardPlacement, type Bounds } from '@/components/coachPlacement';
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
const EDGE = 12;

const inset = (name: string): number => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeBounds = (): Bounds => ({
  top: inset('--ca-safe-top') + EDGE,
  left: inset('--ca-safe-left') + EDGE,
  right: window.innerWidth - inset('--ca-safe-right') - EDGE,
  bottom: window.innerHeight - inset('--ca-safe-bottom') - EDGE,
});

interface MarkViewProps {
  mark: CoachMarkDef;
  rect: CoachRect;
  onNext: () => void;
  onSkipAll: () => void;
}

const MarkView = ({ mark, rect, onNext, onSkipAll }: MarkViewProps) => {
  const { t } = useTranslation(['run', 'common']);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const w = window.innerWidth;
  const h = window.innerHeight;

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (card === null) return;
    const place = (): void => {
      const { left, top } = coachCardPlacement(
        rect,
        { w: card.offsetWidth, h: card.offsetHeight },
        safeBounds(),
      );
      card.style.left = `${String(left)}px`;
      card.style.top = `${String(top)}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(card);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, [rect]);
  return (
    <div className={styles.root} data-coach-mark={mark.id}>
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
      <div
        ref={cardRef}
        className={styles.card}
        style={{ width: Math.min(CARD_W, w - 2 * EDGE) }}
      >
        <span className={styles.title}>{t(mark.title)}</span>
        <span className={styles.body}>{t(mark.body)}</span>
        <div className={styles.actions}>
          <Button
            size="compact-xs"
            variant="subtle"
            data-testid="coach-skip"
            onClick={onSkipAll}
          >
            {t('run:tutorial.skipAll')}
          </Button>
          <Button size="compact-xs" data-testid="coach-next" onClick={onNext}>
            {t('run:tutorial.next')}
          </Button>
        </div>
      </div>
    </div>
  );
};

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
