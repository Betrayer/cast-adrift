export interface ArcInput {
  width: number;
  maxHeight: number;
  count: number;
}

export interface ArcPod {
  x: number;
  y: number;
}

export interface ArcSolution {
  fits: boolean;
  podSize: number;
  radius: number;
  spanDeg: number;
  height: number;
  centre: ArcPod;
  shipSize: number;
  pods: ArcPod[];
}

export const ARC_MIN_WIDTH = 340;
export const ARC_MIN_POD = 48;
export const ARC_MAX_POD = 64;
export const ARC_WIDE_WIDTH = 560;
export const ARC_MAX_POD_WIDE = 84;
export const ARC_MAX_SHIP = 76;
export const ARC_MAX_SHIP_WIDE = 116;
export const ARC_SPAN_MIN = 150;
export const ARC_SPAN_MAX = 170;

const POD_GAP = 6;
const EDGE_PAD = 6;
const SHIP_PAD = 6;
const POD_STEP = 2;
const SPAN_STEP = 5;

const NO_FIT: ArcSolution = {
  fits: false,
  podSize: ARC_MIN_POD,
  radius: 0,
  spanDeg: ARC_SPAN_MIN,
  height: 0,
  centre: { x: 0, y: 0 },
  shipSize: 0,
  pods: [],
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export const arcMaxPod = (width: number): number =>
  width >= ARC_WIDE_WIDTH ? ARC_MAX_POD_WIDE : ARC_MAX_POD;

export const arcShipSize = (width: number): number =>
  clamp(
    width * 0.16,
    44,
    width >= ARC_WIDE_WIDTH ? ARC_MAX_SHIP_WIDE : ARC_MAX_SHIP,
  );

const anglesFor = (count: number, spanDeg: number): number[] => {
  if (count <= 1) return [90];
  const step = spanDeg / (count - 1);
  return Array.from({ length: count }, (_, i) => 90 + spanDeg / 2 - i * step);
};

interface Attempt {
  radius: number;
  height: number;
  centreY: number;
  angles: number[];
}

const tryFit = (
  input: ArcInput,
  podSize: number,
  spanDeg: number,
  shipSize: number,
): Attempt | null => {
  const angles = anglesFor(input.count, spanDeg);
  const sins = angles.map((deg) => Math.sin(toRad(deg)));
  const cosines = angles.map((deg) => Math.abs(Math.cos(toRad(deg))));
  const maxSin = Math.max(...sins);
  const minSin = Math.min(...sins);
  const maxCos = Math.max(...cosines, 0.0001);
  const bottomGap = shipSize / 2 + EDGE_PAD;

  const byChord =
    input.count <= 1
      ? 0
      : (podSize + POD_GAP) /
        (2 * Math.sin(toRad(spanDeg / (input.count - 1)) / 2));
  const byShip = shipSize / 2 + podSize / 2 + SHIP_PAD;
  const byFloor =
    minSin <= 0.0001 ? 0 : (podSize / 2 - bottomGap) / Math.max(minSin, 0.0001);
  const lower = Math.max(byChord, byShip, byFloor, 0);

  const byWidth = (input.width / 2 - EDGE_PAD - podSize / 2) / maxCos;
  const byHeight =
    maxSin <= 0
      ? Number.POSITIVE_INFINITY
      : (input.maxHeight - podSize / 2 - EDGE_PAD - bottomGap) / maxSin;
  const upper = Math.min(byWidth, byHeight);

  if (upper < lower || upper <= 0) return null;
  const radius = upper;
  const centreY = radius * maxSin + podSize / 2 + EDGE_PAD;
  return {
    radius,
    centreY,
    height: centreY + bottomGap,
    angles,
  };
};

export const solveArc = (input: ArcInput): ArcSolution => {
  if (input.count <= 0 || input.width < ARC_MIN_WIDTH || input.maxHeight <= 0) {
    return NO_FIT;
  }
  const shipSize = arcShipSize(input.width);
  for (let pod = arcMaxPod(input.width); pod >= ARC_MIN_POD; pod -= POD_STEP) {
    for (let span = ARC_SPAN_MIN; span <= ARC_SPAN_MAX; span += SPAN_STEP) {
      const attempt = tryFit(input, pod, span, shipSize);
      if (attempt === null) continue;
      const centre: ArcPod = { x: input.width / 2, y: attempt.centreY };
      return {
        fits: true,
        podSize: pod,
        radius: attempt.radius,
        spanDeg: span,
        height: attempt.height,
        centre,
        shipSize,
        pods: attempt.angles.map((deg) => ({
          x: centre.x + attempt.radius * Math.cos(toRad(deg)),
          y: centre.y - attempt.radius * Math.sin(toRad(deg)),
        })),
      };
    }
  }
  return NO_FIT;
};
