import { isSlotBlocked, isSlotShrunk } from '@/game/battle/setup';
import { goalSlotsNow } from '@/game/battle/view';
import { useRegion } from '@/screens/Battle/board/measure';
import { ReserveButton } from '@/screens/Battle/board/SlotDock';
import {
  onSlotTap,
  useDockAnchors,
  useDockModel,
} from '@/screens/Battle/board/useDock';
import { Console } from '@/screens/Battle/console/Console';
import { BattleJournal } from '@/screens/Battle/journal/BattleJournal';
import {
  EndTurnButton,
  ResonanceChips,
  RunActions,
  TopBands,
} from '@/screens/Battle/shell/BattleShell';
import {
  WideCentre,
  WideStage,
} from '@/screens/Battle/layouts/wide/WideStage';
import wideStyles from '@/screens/Battle/layouts/wide/Wide.module.css';
import { CheckBanner } from '@/screens/Battle/shell/CheckBanner';
import { ForecastStrip } from './ForecastStrip';
import { SlotRow } from './SlotRow';
import boardStyles from '@/screens/Battle/board/Board.module.css';
import screenStyles from '@/screens/Battle/BattleScreen.module.css';
import styles from './Tablet.module.css';

export const Conveyor = () => {
  const { board, ordered, legal, projections, reserved, reserveMax } =
    useDockModel();
  const { root } = useDockAnchors(ordered.length);

  return (
    <div className={styles.conveyor} ref={root} data-band="dock">
      {ordered.map((slotId, index) => {
        const slot = board.slots[slotId];
        if (slot === undefined) return null;
        return (
          <SlotRow
            key={slotId}
            slotId={slotId}
            slot={slot}
            order={index + 1}
            projection={projections[slotId]}
            occupiedBy={slot.dieUid}
            blocked={isSlotBlocked(board, slotId)}
            shrunk={isSlotShrunk(board, slotId)}
            legal={legal.slots.includes(slotId)}
            goal={goalSlotsNow(board).includes(slotId)}
            onTap={onSlotTap}
          />
        );
      })}
      <ReserveButton
        legal={legal.reserve}
        held={reserved.length}
        max={reserveMax}
        className={styles.reserve}
      />
    </div>
  );
};

export const TabletBody = () => {
  const enemyRef = useRegion('enemies');
  const trayRef = useRegion('tray');
  return (
    <div className={boardStyles.column} data-layout="tablet">
      <div ref={enemyRef} className={styles.enemyBand} data-band="enemies" />
      <ForecastStrip />
      <div className={styles.grid}>
        <Conveyor />
        <div ref={trayRef} className={styles.trayBand} data-band="tray" />
      </div>
    </div>
  );
};

export const TabletFooter = () => (
  <div className={screenStyles.centreColumn}>
    <ResonanceChips />
    <CheckBanner />
    <Console compact />
    <EndTurnButton />
  </div>
);

export const TabletWide = () => {
  const enemyRef = useRegion('enemies');
  const trayRef = useRegion('tray');
  return (
    <WideStage
      arena="wide"
      left={
        <>
          <TopBands wide />
          <div className={styles.wideConveyor}>
            <Conveyor />
          </div>
        </>
      }
      centre={
        <WideCentre
          body={
            <div className={boardStyles.column} data-layout="tablet">
              <div
                ref={enemyRef}
                className={styles.wideEnemyBand}
                data-band="enemies"
              />
              <div
                ref={trayRef}
                className={styles.wideTrayBand}
                data-band="tray"
              />
            </div>
          }
          foot={<TabletFooter />}
        />
      }
      right={
        <>
          <ForecastStrip />
          <div className={wideStyles.railActions}>
            <RunActions />
          </div>
          <BattleJournal />
        </>
      }
    />
  );
};
