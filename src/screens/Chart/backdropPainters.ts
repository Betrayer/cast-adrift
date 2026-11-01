import { hexToRgb } from '@/app/color';
import type { ChartLayout, Point } from '@/game/chart/layouts';
import { resampleByLength, normalOf, tangentAt } from '@/game/chart/layouts/geometry';
import type { ChartGlow } from '@/game/chart/layouts/glow';
import { createStream, deriveSeed } from '@/services/rng';
import type { School } from '@/types/content';

export const PARTICLE_BUDGET = 300;

const RAIL_POINTS = 64;
const SPIRAL_MOTES = 260;
const RING_STARS = 220;
const SKY_STARS = 260;
const NEBULA_DUST = 180;
const SHOOTING_EVERY = 600;
const SHOOTING_FRAMES = 40;
const TWINKLE = 0.02;
const CORE_GLOW_RADIUS = 190;

interface Mote {
  x: number;
  y: number;
  size: number;
  phase: number;
  speed: number;
  drift: number;
  rail: number;
  u: number;
  lane: number;
}

interface Blob {
  rail: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  phase: number;
}

interface Rail {
  school: School;
  points: Point[];
  normals: Point[];
}

export interface BackdropField {
  layout: ChartLayout;
  rails: Rail[];
  motes: Mote[];
  blobs: Blob[];
  shootingSeed: number;
}

export interface BackdropPalette {
  schools: Readonly<Record<School, string>>;
  core: string;
  star: string;
}

const rgba = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex);
  return `rgba(${String(Math.round(rgb.r * 255))},${String(Math.round(rgb.g * 255))},${String(Math.round(rgb.b * 255))},${alpha.toFixed(3)})`;
};

const railOf = (school: School, backbone: readonly Point[]): Rail => {
  const points = resampleByLength(backbone, RAIL_POINTS);
  return {
    school,
    points,
    normals: points.map((_, index) => normalOf(tangentAt(points, index))),
  };
};

export const fieldSize = (field: BackdropField): number =>
  field.motes.length + field.blobs.length;

export const buildField = (layout: ChartLayout): BackdropField => {
  const rng = createStream(deriveSeed(0, `chartBackdrop:${layout.id}`));
  const rails = layout.regions.map((region) => railOf(region.school, region.backbone));
  const { bounds } = layout;
  const inBounds = (): { x: number; y: number } => ({
    x: bounds.x + rng.next() * bounds.w,
    y: bounds.y + rng.next() * bounds.h,
  });
  const mote = (overrides: Partial<Mote>): Mote => ({
    ...inBounds(),
    size: 1.2 + rng.next() * 2.4,
    phase: rng.next() * Math.PI * 2,
    speed: 0,
    drift: 0,
    rail: -1,
    u: 0,
    lane: 0,
    ...overrides,
  });
  const motes: Mote[] = [];
  const blobs: Blob[] = [];
  if (layout.id === 'spiral') {
    for (let i = 0; i < SPIRAL_MOTES; i += 1) {
      motes.push(
        mote({
          rail: i % Math.max(1, rails.length),
          u: rng.next(),
          lane: (rng.next() - 0.5) * 70,
          speed: 0.0004 + rng.next() * 0.0008,
        }),
      );
    }
  } else if (layout.id === 'rings') {
    for (let i = 0; i < RING_STARS; i += 1) {
      motes.push(mote({ speed: 0.05 + rng.next() * 0.12 }));
    }
  } else if (layout.id === 'constellations') {
    for (let i = 0; i < SKY_STARS; i += 1) {
      motes.push(mote({ size: 0.9 + rng.next() * 2, speed: 0.01 + rng.next() * 0.03 }));
    }
  } else {
    for (let i = 0; i < NEBULA_DUST; i += 1) {
      motes.push(
        mote({
          speed: (rng.next() - 0.5) * 0.12,
          drift: (rng.next() - 0.5) * 0.12,
        }),
      );
    }
    layout.regions.forEach((region, index) => {
      for (let k = 0; k < 2; k += 1) {
        const along = (rng.next() - 0.5) * region.rx * 0.7;
        const across = (rng.next() - 0.5) * region.ry * 0.6;
        blobs.push({
          rail: index,
          x:
            region.centre.x +
            Math.cos(region.rotation) * along -
            Math.sin(region.rotation) * across,
          y:
            region.centre.y +
            Math.sin(region.rotation) * along +
            Math.cos(region.rotation) * across,
          rx: region.rx * (0.7 + rng.next() * 0.3),
          ry: region.ry * (0.7 + rng.next() * 0.3),
          rotation: region.rotation,
          phase: rng.next() * Math.PI * 2,
        });
      }
    });
  }
  return {
    layout,
    rails,
    motes: motes.slice(0, PARTICLE_BUDGET - blobs.length),
    blobs,
    shootingSeed: rng.next(),
  };
};

const twinkle = (mote: Mote, frame: number): number =>
  0.35 + 0.65 * Math.abs(Math.sin(mote.phase + frame * TWINKLE));

const wrap = (value: number, start: number, span: number): number =>
  start + ((((value - start) % span) + span) % span);

const dot = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void => {
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
};

const paintCore = (
  ctx: CanvasRenderingContext2D,
  field: BackdropField,
  glow: ChartGlow,
  palette: BackdropPalette,
): void => {
  const { centre } = field.layout;
  const gradient = ctx.createRadialGradient(
    centre.x,
    centre.y,
    0,
    centre.x,
    centre.y,
    CORE_GLOW_RADIUS,
  );
  gradient.addColorStop(0, rgba(palette.core, Math.min(0.6, glow.hub * 1.6)));
  gradient.addColorStop(1, rgba(palette.core, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, CORE_GLOW_RADIUS, 0, Math.PI * 2);
  ctx.fill();
};

const paintSpiral = (
  ctx: CanvasRenderingContext2D,
  field: BackdropField,
  glow: ChartGlow,
  palette: BackdropPalette,
  frame: number,
): void => {
  field.rails.forEach((rail, index) => {
    ctx.fillStyle = palette.schools[rail.school];
    const strength = Math.min(1, glow.schools[rail.school] * 3);
    for (const mote of field.motes) {
      if (mote.rail !== index) continue;
      const u = (mote.u + frame * mote.speed) % 1;
      const at = Math.min(RAIL_POINTS - 1, Math.floor(u * (RAIL_POINTS - 1)));
      const point = rail.points[at];
      const normal = rail.normals[at];
      if (point === undefined || normal === undefined) continue;
      ctx.globalAlpha = 0.55 * strength * twinkle(mote, frame);
      dot(ctx, point.x + normal.x * mote.lane, point.y + normal.y * mote.lane, mote.size);
    }
  });
};

const paintDrift = (
  ctx: CanvasRenderingContext2D,
  field: BackdropField,
  palette: BackdropPalette,
  frame: number,
  alpha: number,
): void => {
  const { bounds } = field.layout;
  ctx.fillStyle = palette.star;
  for (const mote of field.motes) {
    const x = wrap(mote.x + frame * mote.drift, bounds.x, bounds.w);
    const y = wrap(mote.y - frame * mote.speed, bounds.y, bounds.h);
    ctx.globalAlpha = alpha * twinkle(mote, frame);
    dot(ctx, x, y, mote.size);
  }
};

const paintSky = (
  ctx: CanvasRenderingContext2D,
  field: BackdropField,
  palette: BackdropPalette,
  frame: number,
): void => {
  ctx.fillStyle = palette.star;
  for (const mote of field.motes) {
    ctx.globalAlpha = 0.25 + 0.6 * Math.abs(Math.sin(mote.phase + frame * mote.speed));
    dot(ctx, mote.x, mote.y, mote.size);
  }
  const cycle = Math.floor(frame / SHOOTING_EVERY);
  const age = frame % SHOOTING_EVERY;
  if (frame === 0 || age > SHOOTING_FRAMES) return;
  const rng = createStream(deriveSeed(Math.floor(field.shootingSeed * 1e9), `shot:${String(cycle)}`));
  const { bounds } = field.layout;
  const x = bounds.x + rng.next() * bounds.w * 0.8;
  const y = bounds.y + rng.next() * bounds.h * 0.4;
  const head = { x: x + age * 12, y: y + age * 7 };
  ctx.globalAlpha = Math.max(0, 1 - age / SHOOTING_FRAMES);
  ctx.strokeStyle = palette.star;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(head.x, head.y);
  ctx.lineTo(head.x - 70, head.y - 42);
  ctx.stroke();
};

const paintNebulae = (
  ctx: CanvasRenderingContext2D,
  field: BackdropField,
  glow: ChartGlow,
  palette: BackdropPalette,
  frame: number,
): void => {
  for (const blob of field.blobs) {
    const rail = field.rails[blob.rail];
    if (rail === undefined) continue;
    const density = Math.min(0.45, glow.schools[rail.school] * 1.3);
    const sway = Math.sin(blob.phase + frame * 0.003) * 12;
    ctx.save();
    ctx.translate(blob.x + sway, blob.y - sway * 0.6);
    ctx.rotate(blob.rotation);
    ctx.scale(1, blob.ry / blob.rx);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, blob.rx);
    gradient.addColorStop(0, rgba(palette.schools[rail.school], density));
    gradient.addColorStop(0.6, rgba(palette.schools[rail.school], density * 0.45));
    gradient.addColorStop(1, rgba(palette.schools[rail.school], 0));
    ctx.globalAlpha = 1;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, blob.rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  paintDrift(ctx, field, palette, frame, 0.45);
};

export const paintField = (
  ctx: CanvasRenderingContext2D,
  field: BackdropField,
  glow: ChartGlow,
  palette: BackdropPalette,
  frame: number,
): void => {
  ctx.globalAlpha = 1;
  paintCore(ctx, field, glow, palette);
  if (field.layout.id === 'spiral') paintSpiral(ctx, field, glow, palette, frame);
  else if (field.layout.id === 'rings') paintDrift(ctx, field, palette, frame, 0.55);
  else if (field.layout.id === 'constellations') paintSky(ctx, field, palette, frame);
  else paintNebulae(ctx, field, glow, palette, frame);
  ctx.globalAlpha = 1;
};
