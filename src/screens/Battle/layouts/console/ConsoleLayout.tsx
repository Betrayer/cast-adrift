import { useRegion } from '@/screens/Battle/board/measure';
import { SlotDock } from '@/screens/Battle/board/SlotDock';
import { Console } from '@/screens/Battle/console/Console';
import { Forecast } from '@/screens/Battle/console/Forecast';
import {
  EndTurnButton,
  ResonanceChips,
  ScriptHint,
} from '@/screens/Battle/shell/BattleShell';
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

export const ConsoleFooter = () => (
  <div className={styles.centreColumn}>
    <ResonanceChips />
    <ScriptHint />
    <Forecast />
    <Console />
    <EndTurnButton />
  </div>
);
