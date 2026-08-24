import { useRegion } from '@/screens/Battle/board/measure';
import { useBattleStore } from '@/stores/battleStore';
import { SlotDock } from '@/screens/Battle/board/SlotDock';
import { Console } from '@/screens/Battle/console/Console';
import { Forecast } from '@/screens/Battle/console/Forecast';
import { BattleJournal } from '@/screens/Battle/journal/BattleJournal';
import {
  EndTurnButton,
  ResonanceChips,
  RunActions,
  TopBands,
} from '@/screens/Battle/shell/BattleShell';
import {
  WideCentre,
  WideRail,
  WideStage,
} from '@/screens/Battle/layouts/wide/WideStage';
import wideStyles from '@/screens/Battle/layouts/wide/Wide.module.css';
import { CheckBanner } from '@/screens/Battle/shell/CheckBanner';
import boardStyles from '@/screens/Battle/board/Board.module.css';
import styles from '@/screens/Battle/BattleScreen.module.css';

export const ConsoleBody = () => {
  const enemyRef = useRegion('enemies');
  const trayRef = useRegion('tray');
  return (
    <div className={boardStyles.column} data-layout="console">
      <div ref={enemyRef} className={boardStyles.enemyBand} data-band="enemies" />
      <div ref={trayRef} className={boardStyles.trayBand} data-band="tray" />
      <SlotDock />
    </div>
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
          <BattleJournal />
        </>
      }
      centre={<WideCentre body={<ConsoleBody />} />}
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
