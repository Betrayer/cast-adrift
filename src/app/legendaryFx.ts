import { DIE_BY_ID } from "@/data/dice";
import { createStream, fnv1a } from "@/services/rng";
import type { School } from "@/types/content";
import type { DeviceTier } from "./deviceTier";

export type FxSurface = "pixi" | "dom";

export type ParticleKind = "orbit" | "rise" | "sparkle" | "suck";

export interface LegendaryFx {
  motion: boolean;
  particles: number;
}

export interface ParticleSeed {
  x: number;
  y: number;
  angle: number;
  drift: number;
  durationMs: number;
  delayMs: number;
}

export const PARTICLE_BUDGET: Readonly<Record<FxSurface, Readonly<Record<DeviceTier, number>>>> = {
  pixi: { low: 0, mid: 8, high: 12 },
  dom: { low: 0, mid: 6, high: 10 },
};

export const PARTICLE_KIND: Readonly<Record<School, ParticleKind>> = {
  yellow: "orbit",
  blue: "orbit",
  prismatic: "sparkle",
  red: "rise",
  green: "rise",
  grey: "rise",
  black: "suck",
};

export const legendaryFx = ({
  reduced,
  tier,
  surface,
}: {
  reduced: boolean;
  tier: DeviceTier;
  surface: FxSurface;
}): LegendaryFx => ({
  motion: !reduced,
  particles: reduced ? 0 : PARTICLE_BUDGET[surface][tier],
});

export const isLegendaryDie = (defId: string): boolean =>
  DIE_BY_ID.get(defId)?.rarity === "legendary";

export const particleSeeds = (defId: string, count: number): ParticleSeed[] => {
  const rng = createStream(fnv1a(`aura:${defId}`));
  return Array.from({ length: count }, (_, index) => ({
    x: rng.next() * 2 - 1,
    y: rng.next() * 2 - 1,
    angle: (index / Math.max(1, count)) * 360 + rng.next() * 30,
    drift: rng.next() * 2 - 1,
    durationMs: 1600 + Math.round(rng.next() * 1600),
    delayMs: Math.round(rng.next() * 2400),
  }));
};