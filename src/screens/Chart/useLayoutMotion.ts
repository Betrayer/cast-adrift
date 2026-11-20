import { useEffect, useState } from 'react';
import type { Box, ChartLayout, Point } from '@/game/chart/layouts';
import { easeOutQuad, rafTweens } from '@/pixi/tween';

export const LAYOUT_SWITCH_MS = 420;

export interface ShownLayout {
  pos: ReadonlyMap<string, Point>;
  bounds: Box;
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const mixLayouts = (
  from: ShownLayout,
  to: ShownLayout,
  t: number,
): ShownLayout => {
  const pos = new Map<string, Point>();
  for (const [id, end] of to.pos) {
    const start = from.pos.get(id) ?? end;
    pos.set(id, { x: lerp(start.x, end.x, t), y: lerp(start.y, end.y, t) });
  }
  return {
    pos,
    bounds: {
      x: lerp(from.bounds.x, to.bounds.x, t),
      y: lerp(from.bounds.y, to.bounds.y, t),
      w: lerp(from.bounds.w, to.bounds.w, t),
      h: lerp(from.bounds.h, to.bounds.h, t),
    },
  };
};

const shownOf = (layout: ChartLayout): ShownLayout => ({
  pos: layout.pos,
  bounds: layout.bounds,
});

export const useLayoutMotion = (
  layout: ChartLayout,
  reduced: boolean,
): ShownLayout => {
  const [shown, setShown] = useState<ShownLayout>(() => shownOf(layout));
  const [target, setTarget] = useState(layout);
  const [origin, setOrigin] = useState<ShownLayout | null>(null);

  if (target !== layout) {
    setTarget(layout);
    if (reduced) {
      setShown(shownOf(layout));
      setOrigin(null);
    } else {
      setOrigin(shown);
    }
  }

  useEffect(() => {
    if (origin === null) return;
    const { clock, tweens, destroy } = rafTweens();
    const progress = { t: 0 };
    const end = shownOf(target);
    let finished = false;
    tweens.to(progress, { t: 1 }, LAYOUT_SWITCH_MS, easeOutQuad, () => {
      finished = true;
    });
    clock.add(() => {
      if (finished) {
        setShown(end);
        setOrigin(null);
        return;
      }
      setShown(mixLayouts(origin, end, progress.t));
    });
    return () => {
      destroy();
    };
  }, [origin, target]);

  return shown;
};
