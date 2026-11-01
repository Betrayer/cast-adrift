import { echoRevealRows } from "@/data/echo";
import { computeMutatorMods } from "@/data/mutators";

export const BASE_FOG_ROWS = 2;
export const FOG_ROWS_PER_SENSORS_MK = 1;
const DEEP_SCAN_ROWS = 1;
const MIN_FOG_ROWS = 1;

export interface FogInput {
  sensorsMk: number;
  deepScan: boolean;
  bonusReveal: number;
  sectorReveal: number;
  echo: string | null | undefined;
  mutators: readonly string[];
}

const sensorsFogRows = (sensorsMk: number): number =>
  BASE_FOG_ROWS + (sensorsMk - 1) * FOG_ROWS_PER_SENSORS_MK;

export const fogRowsFor = (input: FogInput): number =>
  Math.max(
    MIN_FOG_ROWS,
    sensorsFogRows(input.sensorsMk) +
      (input.deepScan ? DEEP_SCAN_ROWS : 0) +
      input.bonusReveal +
      input.sectorReveal +
      echoRevealRows(input.echo) +
      computeMutatorMods(input.mutators).fogRowDelta,
  );
