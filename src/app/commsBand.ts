export type CommsMetrics = {
  readonly lead: number;
  readonly row: number;
  readonly gap: number;
  readonly inset: number;
};

export type CommsFit = {
  readonly rows: 1 | 2 | 3;
  readonly lines: 1 | 2;
};

type StyleSource = Pick<CSSStyleDeclaration, 'getPropertyValue'>;

const SUBPIXEL_TOLERANCE = 0.5;

const readPx = (style: StyleSource, name: string): number =>
  parseFloat(style.getPropertyValue(name));

export const commsMetricsOf = (style: StyleSource): CommsMetrics => {
  const line = readPx(style, '--comms-line');
  const pad = readPx(style, '--comms-pad');
  return {
    lead: 2 * line + 2 * pad + 2,
    row: line + 2 * pad + 2,
    gap: readPx(style, '--comms-gap'),
    inset: readPx(style, '--comms-inset'),
  };
};

export const fitCommsBand = (height: number, metrics: CommsMetrics): CommsFit => {
  const spare = height + SUBPIXEL_TOLERANCE - metrics.inset - metrics.lead;
  if (!(spare >= 0)) return { rows: 1, lines: 1 };
  const extra = Math.floor(spare / (metrics.row + metrics.gap));
  return { rows: extra >= 2 ? 3 : extra >= 1 ? 2 : 1, lines: 2 };
};
