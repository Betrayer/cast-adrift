import { useMemo } from 'react';
import { SlotCard } from '@/screens/Battle/board/SlotCard';
import { solveArc } from '@/screens/Battle/layouts/orbit/arc';
import { SlotPod } from '@/screens/Battle/layouts/orbit/SlotPod';
import { SlotRow } from '@/screens/Battle/layouts/tablet/SlotRow';
import type { BattleLayoutId } from '@/types';
import { PREVIEW_SLOTS } from './layoutFixture';
import styles from './LayoutPicker.module.css';

const STAGE_W = 344;
const ARC_H = 176;

const noop = (): void => undefined;

const Dice = () => (
  <div className={styles.dice}>
    <span className={styles.die} />
    <span className={styles.die} />
    <span className={styles.die} />
  </div>
);

const ConsolePreview = () => (
  <div className={styles.body}>
    <div className={styles.enemy} />
    <Dice />
    <div className={styles.grid}>
      {PREVIEW_SLOTS.map((entry) => (
        <SlotCard
          key={entry.slotId}
          slotId={entry.slotId}
          slot={entry.slot}
          order={entry.order}
          projection={entry.projection}
          occupiedBy={undefined}
          blocked={false}
          shrunk={false}
          legal={entry.legal}
          offTurn={false}
          charge={6}
          onTap={noop}
          preview
        />
      ))}
    </div>
  </div>
);

const OrbitPreview = () => {
  const solution = useMemo(
    () =>
      solveArc({
        width: STAGE_W,
        maxHeight: ARC_H,
        count: PREVIEW_SLOTS.length,
      }),
    [],
  );
  return (
    <div className={styles.body}>
      <div className={styles.enemy} />
      <Dice />
      <div
        className={styles.arcStage}
        style={{ height: `${String(solution.height)}px` }}
      >
        {PREVIEW_SLOTS.map((entry, index) => {
          const pod = solution.pods[index];
          if (pod === undefined) return null;
          return (
            <SlotPod
              key={entry.slotId}
              slotId={entry.slotId}
              slot={entry.slot}
              order={entry.order}
              projection={entry.projection}
              occupiedBy={undefined}
              blocked={false}
              legal={entry.legal}
              offTurn={false}
              size={solution.podSize}
              x={pod.x}
              y={pod.y}
              onTap={noop}
              preview
            />
          );
        })}
      </div>
    </div>
  );
};

const TabletPreview = () => (
  <div className={styles.body}>
    <div className={styles.enemy} />
    <div className={styles.rows}>
      {PREVIEW_SLOTS.map((entry) => (
        <SlotRow
          key={entry.slotId}
          slotId={entry.slotId}
          slot={entry.slot}
          order={entry.order}
          projection={entry.projection}
          occupiedBy={undefined}
          blocked={false}
          shrunk={false}
          legal={entry.legal}
          offTurn={false}
          onTap={noop}
          preview
        />
      ))}
    </div>
    <Dice />
  </div>
);

const PREVIEWS: Record<BattleLayoutId, () => React.JSX.Element> = {
  console: ConsolePreview,
  orbit: OrbitPreview,
  tablet: TabletPreview,
};

export const LayoutPreview = ({ id }: { id: BattleLayoutId }) => {
  const Body = PREVIEWS[id];
  return (
    <span className={styles.stage} data-layout-preview={id} aria-hidden>
      <span className={styles.stageInner}>
        <Body />
      </span>
    </span>
  );
};
