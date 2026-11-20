export interface EconomyBreaches {
  envelopeRows: number;
  cargoShareRows: number;
}

export interface ActClear {
  entered: number;
  cleared: number;
}

export interface ActStep {
  rate: number;
  gapPp: number;
  sePp: number;
  cliff: boolean;
  rise: boolean;
}

const clearRate = (act: ActClear): number =>
  act.entered === 0 ? 0 : act.cleared / act.entered;

const pooledGapSe = (a: ActClear, b: ActClear): number => {
  const pooled = (a.cleared + b.cleared) / (a.entered + b.entered);
  return Math.sqrt(pooled * (1 - pooled) * (1 / a.entered + 1 / b.entered));
};

export const actRampSteps = (
  acts: readonly ActClear[],
  maxGapPp: number,
  riseSe: number,
): readonly ActStep[] =>
  acts.map((act, index) => {
    const rate = clearRate(act);
    const before = index === 0 ? undefined : acts[index - 1];
    if (before === undefined || before.entered === 0 || act.entered === 0) {
      return { rate, gapPp: 0, sePp: 0, cliff: false, rise: false };
    }
    const gapPp = (rate - clearRate(before)) * 100;
    const sePp = pooledGapSe(act, before) * 100;
    return {
      rate,
      gapPp,
      sePp,
      cliff: Math.abs(gapPp) > maxGapPp,
      rise: gapPp > riseSe * sePp,
    };
  });

export interface LadderReading {
  sector: number;
  winratePct: number;
  target: number | null;
}

export const ladderOutOfBand = (
  readings: readonly LadderReading[],
  bandPp: number,
  diagnosticActs: readonly number[],
): number =>
  readings.filter(
    (reading) =>
      reading.target !== null &&
      !diagnosticActs.includes(reading.sector) &&
      Math.abs(reading.winratePct - reading.target) > bandPp,
  ).length;

export const economyFailureLines = (
  breaches: EconomyBreaches,
  cargoSharePct: number,
): readonly string[] => {
  const lines: string[] = [];
  if (breaches.envelopeRows > 0) {
    lines.push(
      `sim economy: ${String(breaches.envelopeRows)} row(s) outside the §9.3 scrap envelope`,
    );
  }
  if (breaches.cargoShareRows > 0) {
    lines.push(
      `sim economy: ${String(breaches.cargoShareRows)} row(s) over the §9.11 cargo income share of ${String(cargoSharePct)}%`,
    );
  }
  return lines;
};

export interface ChartReading {
  name: string;
  winrate: number;
}

export interface ChartGroups {
  monos: readonly string[];
  multis: readonly string[];
  monoSpreadPp: number;
  multiSpreadPp: number;
  specialisingGapPp: number;
}

const winrateSpreadPp = (rows: readonly ChartReading[]): number =>
  rows.length < 2
    ? 0
    : (Math.max(...rows.map((row) => row.winrate)) - Math.min(...rows.map((row) => row.winrate))) * 100;

const meanWinrate = (rows: readonly ChartReading[]): number =>
  rows.reduce((sum, row) => sum + row.winrate, 0) / Math.max(1, rows.length);

export const chartLikeWithLike = (
  archetypes: readonly ChartReading[],
  deckSchools: readonly string[],
): ChartGroups => {
  const monos = archetypes.filter((row) => deckSchools.some((school) => row.name === `mono-${school}`));
  const multis = archetypes.filter((row) => !row.name.startsWith("mono-"));
  return {
    monos: monos.map((row) => row.name),
    multis: multis.map((row) => row.name),
    monoSpreadPp: winrateSpreadPp(monos),
    multiSpreadPp: winrateSpreadPp(multis),
    specialisingGapPp: (meanWinrate(multis) - meanWinrate(monos)) * 100,
  };
};

export const halfParityPp = (
  halves: readonly ChartReading[],
  school: string,
  against: readonly string[],
): number => {
  const own = halves.find((row) => row.name === `half-${school}`)?.winrate ?? 0;
  const others = halves.filter(
    (row) => row.name !== `half-${school}` && against.some((other) => row.name === `half-${other}`),
  );
  return (own - meanWinrate(others)) * 100;
};
