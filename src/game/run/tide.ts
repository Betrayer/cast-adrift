import { ascensionMods } from "@/data/ascension";
import { DRIFT_TIDE_CAP } from "@/game/run/modes";
import type { RunMode } from "@/stores/runStore";

export const BASE_TIDE_CAP = 3;

export const tideCapFor = (
  ascension: number,
  mode: RunMode = "campaign",
): number =>
  mode === "drift"
    ? DRIFT_TIDE_CAP
    : BASE_TIDE_CAP + ascensionMods(ascension).tideCapDelta;
