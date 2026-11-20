import { DIE_BY_ID } from "@/data/dice";
import { dieTier, type HandDie } from "@/game/dice/tier";
import type { School } from "@/types/content";

export interface RecapDie {
  defId: string;
  tier: number;
  school: School;
}

export interface RecapCard {
  win: boolean;
  shipId: string;
  shipRank: number;
  rankMax: number;
  sector: number;
  sectorMax: number;
  nodes: number;
  kills: number;
  scrap: number;
  ascension: number;
  topDie: RecapDie | null;
}

export const topDieOf = (deck: readonly HandDie[]): RecapDie | null => {
  let best: RecapDie | null = null;
  for (const die of deck) {
    const def = DIE_BY_ID.get(die.defId);
    if (def === undefined) continue;
    const tier = dieTier(die);
    if (best === null || tier > best.tier) best = { defId: die.defId, tier, school: def.school };
  }
  return best;
};

export const namesItsSize = (name: string, tier: number): boolean =>
  name.toLowerCase().includes(`d${String(tier)}`);

export const RECAP_WIDTH = 1080;
export const RECAP_HEIGHT = 1350;

export const recapFileName = (card: RecapCard): string =>
  `cast-adrift-${card.shipId}-${card.win ? "clear" : "run"}-s${String(card.sector)}.png`;
