import { isInverted, resolutionOrder } from "@/game/battle/order";
import type { BattleSnapshot, SlotId } from "@/types/battle";

export type OrderView = Pick<
  BattleSnapshot,
  "inverted" | "foldedTurns" | "slots"
>;

export const resolutionOrderFor = (view: OrderView): SlotId[] =>
  resolutionOrder(view).filter((slotId) => view.slots[slotId] !== undefined);

export const orderBadgeFor = (view: OrderView, slotId: SlotId): number =>
  resolutionOrderFor(view).indexOf(slotId) + 1;

export const orderInverted = (view: OrderView): boolean => isInverted(view);
