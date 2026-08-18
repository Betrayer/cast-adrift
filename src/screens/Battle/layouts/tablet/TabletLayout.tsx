import { isSlotBlocked, isSlotShrunk } from '@/game/battle/setup';
import { slotAllowedThisTurn } from '@/game/battle/view';
import { useRegion } from '@/screens/Battle/board/measure';
import { ReserveButton } from '@/screens/Battle/board/SlotDock';
import {
  onSlotTap,
  useDockAnchors,
  useDockModel,
} from '@/screens/Battle/board/useDock';
import { Console } from '@/screens/Battle/console/Console';
import {
  EndTurnButton,
  ResonanceChips,
  ScriptHint,
} from '@/screens/Battle/shell/BattleShell';
import { ForecastStrip } from './ForecastStrip';
import { SlotRow } from './SlotRow';
import boardStyles from '@/screens/Battle/board/Board.module.css';
import screenStyles from '@/screens/Battle/BattleScreen.module.css';
import styles from './Tablet.module.css';

const Conveyor = () => {
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
            offTurn={!slotAllowedThisTurn(board, slotId)}
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
    <ScriptHint />
    <Console compact />
    <EndTurnButton />
  </div>
);
