import { clamp01 } from "@/app/math";
import { REDUCED_MS } from "@/app/motion";
import { easeOutBack, easeOutCubic } from "@/pixi/tween";
import { createStream, type RngStream } from "@/services/rng";
import type { RollStyle } from "@/types";
import { POLYHEDRA, type DieShape } from "./polyhedra";
import { facingOf, topFace } from "./projection";
import {
  IDENTITY,
  arcBetween,
  axisAngle,
  normalize,
  quatMul,
  quatNormalize,
  rotate,
  slerp,
  type Quat,
  type Vec3,
} from "./vec";

export type { RollStyle };

export const STEER_MS = 250;

export const ROLL_MS = { normal: 900, fast: 600 } as const;

const REV_MIN = 2.5;
const REV_MAX = 4;
const DECAY_SHARE = 0.35;
const BLUR_SWAP_MS = 55;
const POP_MS = 150;
const FLASH_MS = 220;
const REEL_TAIL = [110, 150, 210] as const;
const VIEWER: Vec3 = [0, 0, 1];

export interface RollRequest {
  shape: DieShape;
  labels: readonly string[];
  value: string;
  style: RollStyle;
  durationMs: number;
  seed: number;
  reduced?: boolean;
}

export interface RollFrame {
  q: Quat;
  scale: number;
  labels: readonly string[];
  front: string | null;
  labelAlpha: number;
  blur: number;
  flash: number;
  settled: boolean;
}

export interface RollPlan {
  shape: DieShape;
  style: RollStyle;
  durationMs: number;
  endMs: number;
  landing: number;
  labels: readonly string[];
  target: Quat;
  at: (ms: number) => RollFrame;
}

const randomAxis = (rng: RngStream): Vec3 => {
  const z = rng.next() * 2 - 1;
  const a = rng.next() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return normalize([r * Math.cos(a), r * Math.sin(a), z]);
};

export const landingFaceFor = (
  shape: DieShape,
  labels: readonly string[],
  value: string,
  q: Quat,
): number => {
  const poly = POLYHEDRA[shape];
  let best = -1;
  let bestFacing = -Infinity;
  labels.forEach((label, face) => {
    if (label !== value) return;
    const facing = facingOf(poly, q, face);
    if (facing > bestFacing) {
      bestFacing = facing;
      best = face;
    }
  });
  if (best >= 0) return best;
  return topFace(poly, q);
};

export const faceUp = (shape: DieShape, face: number, from: Quat): Quat => {
  const normal = rotate(from, POLYHEDRA[shape].normals[face] ?? VIEWER);
  return quatNormalize(quatMul(arcBetween(normal, VIEWER), from));
};

const settledLabels = (
  labels: readonly string[],
  landing: number,
  value: string,
): string[] => labels.map((label, face) => (face === landing ? value : label));

const reelSchedule = (durationMs: number, rng: RngStream): number[] => {
  const head = Math.max(0, durationMs - REEL_TAIL.reduce((sum, ms) => sum + ms, 0));
  const ticks: number[] = [];
  let t = 0;
  let gap = 95;
  while (t + gap < head) {
    t += gap;
    ticks.push(t);
    gap = Math.max(40, gap * (0.78 + rng.next() * 0.08));
  }
  let tail = head;
  for (const ms of REEL_TAIL) {
    tail += ms;
    ticks.push(Math.min(durationMs, tail));
  }
  return ticks;
};

export const planRoll = (request: RollRequest): RollPlan => {
  const { shape, value, style } = request;
  const rng = createStream(request.seed);
  const reduced = request.reduced === true;
  const durationMs = reduced ? REDUCED_MS : Math.max(STEER_MS + 50, request.durationMs);

  if (reduced || style !== "flip") {
    const landing = landingFaceFor(shape, request.labels, value, IDENTITY);
    const labels = settledLabels(request.labels, landing, value);
    const target = faceUp(shape, landing, IDENTITY);
    const pool = request.labels.length > 0 ? request.labels : [value];
    const ticks = style === "reel" && !reduced ? reelSchedule(durationMs, rng) : [];
    const reelLabels = ticks.map((_, i) =>
      i === ticks.length - 1 ? value : (pool[rng.int(0, pool.length - 1)] ?? value),
    );
    const blurLabels = Array.from({ length: Math.ceil(durationMs / BLUR_SWAP_MS) }, () =>
      pool[rng.int(0, pool.length - 1)] ?? value,
    );
    const at = (ms: number): RollFrame => {
      const t = Math.max(0, ms);
      const settled = t >= durationMs;
      if (reduced) {
        return {
          q: target,
          scale: 1,
          labels,
          front: value,
          labelAlpha: clamp01(t / durationMs),
          blur: 0,
          flash: 0,
          settled,
        };
      }
      if (style === "reel") {
        let index = -1;
        for (let i = 0; i < ticks.length; i += 1) if ((ticks[i] ?? Infinity) <= t) index = i;
        const lastTick = ticks[ticks.length - 1] ?? durationMs;
        const pop = t >= lastTick ? clamp01((t - lastTick) / POP_MS) : 1;
        return {
          q: target,
          scale: t >= lastTick ? 0.86 + 0.14 * easeOutBack(pop) : 1,
          labels,
          front: settled ? value : (reelLabels[index] ?? pool[0] ?? value),
          labelAlpha: 1,
          blur: 0,
          flash: 0,
          settled,
        };
      }
      const clear = clamp01(t / durationMs);
      const after = t - durationMs;
      return {
        q: target,
        scale: after >= 0 ? 1 + 0.12 * (1 - clamp01(after / POP_MS)) : 1,
        labels,
        front: settled ? value : (blurLabels[Math.floor(t / BLUR_SWAP_MS)] ?? value),
        labelAlpha: 1,
        blur: settled ? 0 : 1 - clear,
        flash: after >= 0 ? 1 - clamp01(after / FLASH_MS) : 0,
        settled,
      };
    };
    const endMs = reduced
      ? durationMs
      : style === "blur"
        ? durationMs + Math.max(POP_MS, FLASH_MS)
        : Math.max(durationMs, (ticks[ticks.length - 1] ?? durationMs) + POP_MS);
    return { shape, style, durationMs, endMs, landing, labels, target, at };
  }

  const q0 = axisAngle(randomAxis(rng), rng.next() * Math.PI * 2);
  const axisA = randomAxis(rng);
  const axisB = randomAxis(rng);
  const omegaA = (REV_MIN + rng.next() * (REV_MAX - REV_MIN)) * Math.PI * 2;
  const omegaB = (REV_MIN + rng.next() * (REV_MAX - REV_MIN)) * Math.PI * 2;
  const tau = (durationMs * DECAY_SHARE) / 1000;
  const free = (ms: number): Quat => {
    const s = Math.max(0, ms) / 1000;
    const decay = tau * (1 - Math.exp(-s / tau));
    return quatNormalize(
      quatMul(axisAngle(axisA, omegaA * decay), quatMul(axisAngle(axisB, omegaB * decay), q0)),
    );
  };
  const steerAt = durationMs - STEER_MS;
  const steerFrom = free(steerAt);
  const landing = landingFaceFor(shape, request.labels, value, steerFrom);
  const labels = settledLabels(request.labels, landing, value);
  const target = faceUp(shape, landing, steerFrom);
  const at = (ms: number): RollFrame => {
    const settled = ms >= durationMs;
    const q = settled
      ? target
      : ms < steerAt
        ? free(ms)
        : slerp(steerFrom, target, easeOutCubic(clamp01((ms - steerAt) / STEER_MS)));
    return {
      q,
      scale: 1,
      labels,
      front: null,
      labelAlpha: 1,
      blur: 0,
      flash: 0,
      settled,
    };
  };
  return { shape, style, durationMs, endMs: durationMs, landing, labels, target, at };
};

export const settledFace = (plan: RollPlan): string =>
  plan.labels[plan.landing] ?? "";
