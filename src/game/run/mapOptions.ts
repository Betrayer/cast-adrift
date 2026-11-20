import type { ContractDef } from "@/data/contracts";
import { computeMutatorMods } from "@/data/mutators";
import type { MapGenOptions } from "@/game/map/generator";
import { contentSector } from "@/game/run/modes";
import type { RunMode } from "@/stores/runStore";

export const eliteLineOf = (contract: ContractDef | undefined): number =>
  (contract?.goals ?? []).reduce(
    (line, goal) => (goal.g === "elitesAtLeast" ? Math.max(line, goal.n) : line),
    0,
  );

export const contractSectorOf = (contract: ContractDef | undefined): number =>
  contentSector(Math.max(1, contract?.setup.sector ?? 1));

export const mapOptionsFor = (
  mutators: readonly string[],
  mode: RunMode,
  contract?: ContractDef,
): MapGenOptions => {
  const line = eliteLineOf(contract);
  return {
    bossAsGate: mode === "drift",
    noShops: computeMutatorMods(mutators).noShops,
    ...(line > 0 ? { eliteLine: line } : {}),
  };
};
