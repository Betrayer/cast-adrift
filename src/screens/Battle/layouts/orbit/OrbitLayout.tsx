import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import { isSlotBlocked } from '@/game/battle/setup';
import { slotAllowedThisTurn } from '@/game/battle/view';
import { publishRegion } from '@/pixi/battle/anchors';
import { rectOf, useRegion } from '@/screens/Battle/board/measure';
import { ReserveButton } from '@/screens/Battle/board/SlotDock';
import { SlotGrid } from '@/screens/Battle/board/SlotGrid';
import {
  onSlotTap,
  useDockAnchors,
  useDockModel,
} from '@/screens/Battle/board/useDock';
import { Console } from '@/screens/Battle/console/Console';
import { Forecast } from '@/screens/Battle/console/Forecast';
import {
  EndTurnButton,
  ResonanceChips,
  ScriptHint,
} from '@/screens/Battle/shell/BattleShell';
import { solveArc } from './arc';
import { RadialMenu } from './RadialMenu';
import { SlotPod } from './SlotPod';
import boardStyles from '@/screens/Battle/board/Board.module.css';
import screenStyles from '@/screens/Battle/BattleScreen.module.css';
import styles from './Orbit.module.css';

const RESERVE_ROW = 46;

interface Box {
  w: number;
  h: number;
}

const EMPTY_BOX: Box = { w: 0, h: 0 };

const useBox = (ref: RefObject<HTMLElement | null>): Box => {
  const [box, setBox] = useState<Box>(EMPTY_BOX);
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;
    const read = (): void => {
      const rect = element.getBoundingClientRect();
      setBox((prev) =>
        prev.w === rect.width && prev.h === rect.height
          ? prev
          : { w: rect.width, h: rect.height },
      );
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    window.addEventListener('resize', read);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', read);
    };
  }, [ref]);
  return box;
};

const OrbitDock = () => {
  const { board, ordered, legal, projections, reserved, reserveMax } =
    useDockModel();
  const shipRef = useRef<HTMLDivElement | null>(null);

  const publishShip = useCallback(() => {
    const element = shipRef.current;
    publishRegion('ship', element === null ? null : rectOf(element));
  }, []);

  const { root, measure } = useDockAnchors(undefined, publishShip);
  const box = useBox(root);
  const solution = useMemo(
    () =>
      solveArc({
        width: box.w,
        maxHeight: box.h - RESERVE_ROW,
        count: ordered.length,
      }),
    [box, ordered.length],
  );

  useEffect(() => {
    measure();
  }, [measure, solution]);

  useEffect(
    () => () => {
      publishRegion('ship', null);
    },
    [],
  );

  return (
    <div
      className={styles.dock}
      ref={root}
      data-band="dock"
      data-arc-fallback={solution.fits ? undefined : '1'}
    >
      {solution.fits ? (
        <div
          className={styles.stage}
          data-arc
          style={{ height: `${String(solution.height)}px` }}
        >
          {ordered.map((slotId, index) => {
            const slot = board.slots[slotId];
            const pod = solution.pods[index];
            if (slot === undefined || pod === undefined) return null;
            return (
              <SlotPod
                key={slotId}
                slotId={slotId}
                slot={slot}
                order={index + 1}
                projection={projections[slotId]}
                occupiedBy={slot.dieUid}
                blocked={isSlotBlocked(board, slotId)}
                legal={legal.slots.includes(slotId)}
                offTurn={!slotAllowedThisTurn(board, slotId)}
                size={solution.podSize}
                x={pod.x}
                y={pod.y}
                onTap={onSlotTap}
              />
            );
          })}
          <div
            ref={shipRef}
            className={styles.ship}
            data-ship
            style={{
              width: `${String(solution.shipSize)}px`,
              height: `${String(solution.shipSize)}px`,
              left: `${String(solution.centre.x - solution.shipSize / 2)}px`,
              top: `${String(solution.centre.y - solution.shipSize / 2)}px`,
            }}
          />
        </div>
      ) : (
        <SlotGrid
          board={board}
          ordered={ordered}
          legal={legal.slots}
          projections={projections}
        />
      )}
      <ReserveButton
        legal={legal.reserve}
        held={reserved.length}
        max={reserveMax}
        className={styles.reserve}
      />
    </div>
  );
};

export const OrbitBody = () => {
  const enemyRef = useRegion('enemies');
  const trayRef = useRegion('tray');
  return (
    <div className={boardStyles.column} data-layout="orbit">
      <div ref={enemyRef} className={styles.enemyBand} data-band="enemies" />
      <div ref={trayRef} className={styles.trayBand} data-band="tray" />
      <OrbitDock />
    </div>
  );
};

export const OrbitFooter = () => (
  <div className={screenStyles.centreColumn}>
    <ResonanceChips />
    <ScriptHint />
    <Forecast />
    <Console compact />
    <EndTurnButton />
    <RadialMenu />
  </div>
);
