import { pushRunCloud } from "@/game/run/cloud";
import { autosaveRun } from "@/game/run/flow";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";

const BATTLE_DEBOUNCE = 800;

let timer: ReturnType<typeof setTimeout> | null = null;
let installed = false;

const flush = (): void => {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  autosaveRun();
};

export const setupAutosave = (): void => {
  if (installed) return;
  installed = true;

  useBattleStore.subscribe(() => {
    if (!useRunStore.getState().active) return;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      autosaveRun();
    }, BATTLE_DEBOUNCE);
  });

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && useRunStore.getState().active) {
        flush();
        pushRunCloud();
      }
    });
  }
};
