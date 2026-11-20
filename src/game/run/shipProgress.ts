import {
  CLEAN_SECTOR_HULL_PCT,
  SHIP_RANK_GAIN,
} from "@/data/shipRanks";
import { MASTERY_XP } from "@/data/shipMastery";
import { gainShipRankXp } from "@/game/run/shipRanks";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";

export type ShipEvent =
  | "elite"
  | "miniboss"
  | "boss"
  | "sectorCleared"
  | "campaignWon"
  | "runEnded";

const MASTERY_XP_FOR: Readonly<Record<ShipEvent, number>> = {
  elite: MASTERY_XP.eliteOrMiniboss,
  miniboss: MASTERY_XP.eliteOrMiniboss,
  boss: MASTERY_XP.boss,
  sectorCleared: MASTERY_XP.sectorCleared,
  campaignWon: MASTERY_XP.campaignWon,
  runEnded: MASTERY_XP.runEnded,
};

const rankGainFor = (event: ShipEvent, hull: number, hullMax: number): number => {
  if (event === "elite") return SHIP_RANK_GAIN.elite;
  if (event === "miniboss") return SHIP_RANK_GAIN.miniboss;
  if (event === "boss") return SHIP_RANK_GAIN.boss;
  if (event !== "sectorCleared") return 0;
  return hull * 100 >= hullMax * CLEAN_SECTOR_HULL_PCT
    ? SHIP_RANK_GAIN.cleanSector
    : 0;
};

export const noteShipEvent = (event: ShipEvent): void => {
  const run = useRunStore.getState();
  useMetaStore.getState().addShipMasteryXp(run.shipId, MASTERY_XP_FOR[event]);
  gainShipRankXp(rankGainFor(event, run.hull, run.hullMax));
};
