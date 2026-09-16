import { BASE_CARGO_HOLD } from "@/data/cargo";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";

export const shipCargoHold = (shipId: ShipId): number =>
  SHIP_BY_ID.get(shipId)?.cargoHold ?? BASE_CARGO_HOLD;
