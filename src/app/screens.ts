import type { ScreenId } from "@/types";

export const screenPhase: Partial<Record<ScreenId, number>> = {
  runSetup: 5,
  map: 5,
  shop: 5,
  shipyard: 5,
  summary: 5,
  event: 6,
  codex: 6,
  hangar: 7,
  chart: 7,
  modes: 9,
};
