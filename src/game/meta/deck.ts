import { DIE_BY_ID } from "@/data/dice";
import { deckPoints, DECK_MIN, FATE_TIER } from "@/data/metaShop";
import { DECK_CAP } from "@/game/economy/prices";

export interface DeckValidation {
  valid: boolean;
  pts: number;
  over: boolean;
  overCap: boolean;
  underMin: boolean;
  multiFate: boolean;
}

export const validateDeck = (
  deck: readonly string[],
  budget: number,
): DeckValidation => {
  const pts = deckPoints(deck);
  const fate = deck.filter(
    (id) => DIE_BY_ID.get(id)?.tier === FATE_TIER,
  ).length;
  const over = pts > budget;
  const overCap = deck.length > DECK_CAP;
  const underMin = deck.length < DECK_MIN;
  const multiFate = fate > 1;
  return {
    valid: !over && !overCap && !underMin && !multiFate,
    pts,
    over,
    overCap,
    underMin,
    multiFate,
  };
};
