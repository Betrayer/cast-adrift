import { ascensionMods } from "@/data/ascension";
import { sectorDef } from "@/data/sectors";
import { DRIFT_TIDE_CAP } from "@/game/run/modes";
import type { RunMode } from "@/stores/runStore";

export const BASE_TIDE_CAP = 3;

export const tideCapFor = (
  ascension: number,
  mode: RunMode = "campaign",
  sector = 1,
): number =>
  mode === "drift"
    ? DRIFT_TIDE_CAP
    : sectorDef(sector).tideCap + ascensionMods(ascension).tideCapDelta;
