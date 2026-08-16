import { ascensionMods } from "@/data/ascension";
import { sectorDef } from "@/data/sectors";
import { DRIFT_TIDE_CAP } from "@/game/run/modes";
import type { RunMode } from "@/stores/runStore";

export const BASE_TIDE_CAP = 3;

// The sector's own `tideCap` is the campaign base. Sectors 1–5 all declare 3, so
// this reads exactly as it always did; «За Ядром» declares 5 and is therefore
// uncapped by drift's rules without a second code path for it.
export const tideCapFor = (
  ascension: number,
  mode: RunMode = "campaign",
  sector = 1,
): number =>
  mode === "drift"
    ? DRIFT_TIDE_CAP
    : sectorDef(sector).tideCap + ascensionMods(ascension).tideCapDelta;
