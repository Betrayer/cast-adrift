import {
  BASE_MODULE_SLOTS,
  MAX_MODULE_SLOTS,
} from "@/data/modules/types";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";

export const BAY_PURCHASES_PER_RUN = 1;

export const shipBays = (shipId: ShipId): number =>
  SHIP_BY_ID.get(shipId)?.moduleSlots ?? BASE_MODULE_SLOTS;

export const moduleSlots = (
  shipId: ShipId,
  moduleSlotDelta: number,
  baysPurchased = 0,
): number =>
  Math.min(
    MAX_MODULE_SLOTS,
    shipBays(shipId) +
      Math.max(0, moduleSlotDelta) +
      Math.max(0, baysPurchased),
  );

export const bayPurchasable = (
  shipId: ShipId,
  moduleSlotDelta: number,
  baysPurchased: number,
): boolean =>
  baysPurchased < BAY_PURCHASES_PER_RUN &&
  moduleSlots(shipId, moduleSlotDelta, baysPurchased) < MAX_MODULE_SLOTS;
