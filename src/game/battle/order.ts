import type { BattleSnapshot, SlotId } from "@/types/battle";

export const RESOLUTION_ORDER: readonly SlotId[] = [
  "sensors",
  "weaponA",
  "weaponB",
  "spinal",
  "shields",
  "shieldsB",
  "engines",
  "reactor",
  "repairBay",
];

// «Инверсия»: the reactor pays before the guns fire, the engines set their tier
// after the shots are already gone, and a mark laid by Sensors lands too late to
// help anything. It is the same loop over the same list read backwards — there is
// no second resolver and no per-slot special case.
export const INVERTED_RESOLUTION_ORDER: readonly SlotId[] = [
  ...RESOLUTION_ORDER,
].reverse();

export type OrderState = Pick<BattleSnapshot, "inverted" | "foldedTurns">;

// A fold inside an inverted node cancels back to the ordinary order, which is
// exactly what the name promises and the only reason the two are XOR-ed.
export const isInverted = (snapshot: OrderState): boolean =>
  (snapshot.inverted === true) !== ((snapshot.foldedTurns ?? 0) > 0);

export const resolutionOrder = (snapshot: OrderState): readonly SlotId[] =>
  isInverted(snapshot) ? INVERTED_RESOLUTION_ORDER : RESOLUTION_ORDER;
