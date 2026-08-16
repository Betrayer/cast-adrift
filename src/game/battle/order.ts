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

export const INVERTED_RESOLUTION_ORDER: readonly SlotId[] = [
  ...RESOLUTION_ORDER,
].reverse();

export type OrderState = Pick<BattleSnapshot, "inverted" | "foldedTurns">;

export const isInverted = (snapshot: OrderState): boolean =>
  (snapshot.inverted === true) !== ((snapshot.foldedTurns ?? 0) > 0);

export const resolutionOrder = (snapshot: OrderState): readonly SlotId[] =>
  isInverted(snapshot) ? INVERTED_RESOLUTION_ORDER : RESOLUTION_ORDER;
