import { cargoDef, cargoPayout, type CargoDef } from "@/data/cargo";
import { CABIN_CAP, officerDef, type OfficerDef } from "@/data/officers";
import { cargoRowsLeft } from "@/game/run/cargo";
import type { MapGraph } from "@/game/map/types";
import type { RunCargo } from "@/stores/runStore";

export type CabinRow =
  | { kind: "officer"; index: number; def: OfficerDef }
  | { kind: "empty"; index: number };

export const cabinRows = (officers: readonly string[]): readonly CabinRow[] =>
  Array.from({ length: CABIN_CAP }, (_, index): CabinRow => {
    const id = officers[index];
    const def = id === undefined ? undefined : officerDef(id);
    return def === undefined
      ? { kind: "empty", index }
      : { kind: "officer", index, def };
  });

export interface CargoRow {
  def: CargoDef;
  rows: number;
  payout: number;
}

export const cargoRows = (
  held: readonly RunCargo[],
  map: MapGraph | null,
  positionRow: number,
  scrapMult: number,
): readonly CargoRow[] =>
  held.flatMap((entry) => {
    const def = cargoDef(entry.defId);
    if (def === undefined) return [];
    return [
      {
        def,
        rows: map === null ? 0 : cargoRowsLeft(map, entry, positionRow),
        payout: cargoPayout(def, scrapMult),
      },
    ];
  });

export const emptyHoldSlots = (
  held: readonly RunCargo[],
  hold: number,
): number => Math.max(0, hold - held.length);
