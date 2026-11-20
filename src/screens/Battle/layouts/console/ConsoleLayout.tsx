import { useRegion } from '@/screens/Battle/board/measure';
import { CommsBand } from '@/components/CommsBand';
import { BoardColumn, type BoardComposition } from '@/screens/Battle/layouts/BoardColumn';
import { useBattleStore } from '@/stores/battleStore';
import { SlotDock } from '@/screens/Battle/board/SlotDock';
import { Console } from '@/screens/Battle/console/Console';
import { Forecast } from '@/screens/Battle/console/Forecast';
import { BattleJournal } from '@/screens/Battle/journal/BattleJournal';
import { TopBands } from '@/screens/Battle/shell/BattleShell';
import { EndTurnButton } from '@/screens/Battle/shell/EndTurnButton';
import { ResonanceChips } from '@/screens/Battle/shell/ResonanceChips';
import { RunActions } from '@/screens/Battle/shell/RunActions';
import {
  WideCentre,
  WideRail,
  WideStage,
} from '@/screens/Battle/layouts/wide/WideStage';
import wideStyles from '@/screens/Battle/layouts/wide/Wide.module.css';
import { CheckBanner } from '@/screens/Battle/shell/CheckBanner';
import boardStyles from '@/screens/Battle/board/Board.module.css';
import styles from '@/screens/Battle/BattleScreen.module.css';

export const ConsoleBody = ({ composition }: { composition: BoardComposition }) => {
  const enemyRef = useRegion('enemies');
  const trayRef = useRegion('tray');
  return (
    <BoardColumn layout="console" composition={composition}>
      <div ref={enemyRef} className={boardStyles.enemyBand} data-band="enemies" />
      <div ref={trayRef} className={boardStyles.trayBand} data-band="tray" />
      <SlotDock />
    </BoardColumn>
  );
};

export const ConsoleFooter = () => {
  const checkActive = useBattleStore((s) => s.checkSteps !== null);
  return (
    <div className={styles.centreColumn}>
      <ResonanceChips />
      <CheckBanner />
      <Forecast />
      <Console compact={checkActive} />
      <EndTurnButton />
    </div>
  );
};

export const ConsoleWide = () => {
  const checkActive = useBattleStore((s) => s.checkSteps !== null);
  return (
    <WideStage
      left={
        <>
          <TopBands wide />
          <CommsBand placement="gutter" />
          <BattleJournal />
        </>
      }
      centre={<WideCentre body={<ConsoleBody composition="wide" />} />}
      right={
        <WideRail>
          <ResonanceChips />
          <CheckBanner />
          <Forecast />
          <Console compact={checkActive} />
          <EndTurnButton />
          <div className={wideStyles.railActions}>
            <RunActions />
          </div>
        </WideRail>
      }
    />
  );
};
