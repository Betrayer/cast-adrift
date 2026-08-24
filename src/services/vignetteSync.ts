import {
  clearVignette,
  setVignetteRim,
  syncHullRim,
} from "@/services/vignette";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";

const read = (): void => {
  const battle = useBattleStore.getState();
  if (battle.phase !== "idle") {
    setVignetteRim("shield", battle.shield > 0);
    syncHullRim(battle.hull, battle.hullMax);
    return;
  }
  setVignetteRim("shield", false);
  const run = useRunStore.getState();
  if (!run.active) {
    clearVignette();
    return;
  }
  syncHullRim(run.hull, run.hullMax);
};

export const setupVignetteSync = (): (() => void) => {
  const stopBattle = useBattleStore.subscribe(read);
  const stopRun = useRunStore.subscribe(read);
  read();
  return () => {
    stopBattle();
    stopRun();
    clearVignette();
  };
};
