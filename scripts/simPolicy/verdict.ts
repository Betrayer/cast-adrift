export interface EconomyBreaches {
  envelopeRows: number;
  cargoShareRows: number;
}

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
