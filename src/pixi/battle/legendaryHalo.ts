import { Container, Graphics, Particle, ParticleContainer, Sprite, Texture } from "pixi.js";
import { hexToNumber } from "@/app/color";
import { PARTICLE_KIND, particleSeeds, type ParticleKind, type ParticleSeed } from "@/app/legendaryFx";
import { schools } from "@/data/schools";
import type { School } from "@/types/content";

const GLOW_TEXTURE_SIZE = 128;
const DOT_TEXTURE_SIZE = 8;
const GLOW_SPAN = 1.9;
const DOT_SCALE = 0.42;
const BLACK_CORE = 0x140a28;
const TAU = Math.PI * 2;

export interface HaloFrame {
  glowScale: number;
  glowAlpha: number;
  accentAngle: number;
  accentAlpha: number;
  accentScale: number;
  accentX: number;
  hue: number | null;
}

const wave = (ms: number, periodMs: number): number => 0.5 + 0.5 * Math.sin((ms / periodMs) * TAU);

const loop = (ms: number, periodMs: number): number => (((ms % periodMs) + periodMs) % periodMs) / periodMs;

const FLICKER = [0.55, 0.9, 0.65, 1, 0.7, 0.6] as const;

const STILL: HaloFrame = {
  glowScale: 1,
  glowAlpha: 0.85,
  accentAngle: 0,
  accentAlpha: 1,
  accentScale: 1,
  accentX: 0,
  hue: null,
};

export const haloFrame = (school: School, ms: number, motion: boolean): HaloFrame => {
  const base = { ...STILL, accentAlpha: school === "red" ? 0 : school === "green" ? 0 : 1 };
  if (!motion) return base;
  switch (school) {
    case "yellow": {
      const pulse = wave(ms, 2200);
      return { ...base, glowScale: 0.92 + 0.16 * pulse, glowAlpha: 0.75 + 0.25 * pulse, accentAngle: loop(ms, 16000) * TAU };
    }
    case "blue":
      return { ...base, glowAlpha: 0.7 + 0.3 * wave(ms, 1800), accentAngle: loop(ms, 2400) * TAU };
    case "prismatic":
      return { ...base, accentAngle: loop(ms, 5000) * TAU, hue: loop(ms, 5000) * 360 };
    case "red": {
      const step = FLICKER[Math.floor(loop(ms, 1100) * FLICKER.length)] ?? 1;
      return { ...base, glowAlpha: step, glowScale: 0.95 + 0.11 * (step - 0.55) };
    }
    case "green": {
      const ripple = loop(ms, 2600);
      return {
        ...base,
        glowScale: 0.9 + 0.15 * wave(ms, 3400),
        glowAlpha: 0.7 + 0.3 * wave(ms, 3400),
        accentScale: 0.96 + 0.49 * ripple,
        accentAlpha: 0.9 * (1 - ripple),
      };
    }
    case "grey": {
      const sweep = Math.min(1, loop(ms, 2800) / 0.45);
      return { ...base, accentX: -0.8 + 1.6 * sweep, accentAlpha: sweep >= 1 ? 0 : 1 };
    }
    case "black":
      return { ...base, glowAlpha: 0.75 + 0.25 * wave(ms, 4000), accentAngle: -loop(ms, 9000) * TAU };
  }
};

const hueToRgb = (hue: number): number => {
  const h = (((hue % 360) + 360) % 360) / 60;
  const x = 1 - Math.abs((h % 2) - 1);
  const [r, g, b] =
    h < 1 ? [1, x, 0] : h < 2 ? [x, 1, 0] : h < 3 ? [0, 1, x] : h < 4 ? [0, x, 1] : h < 5 ? [x, 0, 1] : [1, 0, x];
  const lift = (c: number): number => Math.round(110 + c * 145);
  return (lift(r) << 16) | (lift(g) << 8) | lift(b);
};

let glowTexture: Texture | null = null;
let dotTexture: Texture | null = null;

const radialTexture = (size: number, stops: readonly [number, string][]): Texture => {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx !== null) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [at, colour] of stops) gradient.addColorStop(at, colour);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return Texture.from(canvas);
};

const haloTextures = (): { glow: Texture; dot: Texture } => {
  glowTexture ??= radialTexture(GLOW_TEXTURE_SIZE, [
    [0, "rgba(255,255,255,0.9)"],
    [0.45, "rgba(255,255,255,0.28)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  dotTexture ??= radialTexture(DOT_TEXTURE_SIZE, [
    [0, "rgba(255,255,255,1)"],
    [0.6, "rgba(255,255,255,0.8)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  return { glow: glowTexture, dot: dotTexture };
};

const drawAccent = (g: Graphics, school: School, size: number): void => {
  const stroke = hexToNumber(schools[school].stroke);
  const r = size * 0.62;
  switch (school) {
    case "yellow":
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * TAU;
        const spread = 0.035;
        g.poly([
          Math.cos(a - spread) * size * 0.6,
          Math.sin(a - spread) * size * 0.6,
          Math.cos(a) * size * 0.92,
          Math.sin(a) * size * 0.92,
          Math.cos(a + spread) * size * 0.6,
          Math.sin(a + spread) * size * 0.6,
        ]);
      }
      g.fill({ color: stroke, alpha: 0.55 });
      return;
    case "blue":
      g.arc(0, 0, r, 0, TAU / 6).stroke({ color: 0xbfe3ff, width: 2.5, alpha: 0.95 });
      return;
    case "prismatic":
      g.circle(0, 0, r).stroke({ color: 0xffffff, width: 2, alpha: 0.9 });
      return;
    case "red":
      return;
    case "green":
      g.roundRect(-size / 2, -size / 2, size, size, size * 0.26).stroke({ color: 0xa0e678, width: 1.5, alpha: 1 });
      return;
    case "grey":
      g.poly([-size * 0.06, -size * 0.66, size * 0.06, -size * 0.66, size * 0.02, size * 0.66, -size * 0.1, size * 0.66]);
      g.fill({ color: 0xffffff, alpha: 0.55 });
      return;
    case "black":
      for (let i = 0; i < 16; i += 1) {
        const a = (i / 16) * TAU;
        g.arc(0, 0, size * 0.68, a, a + TAU / 40).stroke({ color: 0xc8aaff, width: 1.5, alpha: 0.8 });
      }
      return;
  }
};

interface HaloParticle {
  particle: Particle;
  seed: ParticleSeed;
}

const placeParticle = (kind: ParticleKind, seed: ParticleSeed, ms: number, size: number): { x: number; y: number; scale: number; alpha: number } => {
  const t = loop(ms + seed.delayMs, seed.durationMs);
  const fade = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : 1;
  switch (kind) {
    case "orbit": {
      const a = ((seed.angle + 180 * t) / 180) * Math.PI;
      const radius = size * (0.62 + 0.06 * seed.drift);
      return { x: Math.cos(a) * radius, y: Math.sin(a) * radius, scale: 1 - 0.6 * t, alpha: fade };
    }
    case "rise":
      return {
        x: seed.x * size * 0.5 + seed.drift * 8 * t,
        y: size * 0.4 - size * 1.1 * t,
        scale: 1 - 0.7 * t,
        alpha: fade,
      };
    case "sparkle": {
      const pop = Math.sin(t * Math.PI);
      return { x: seed.x * size * 0.72, y: seed.y * size * 0.72, scale: 1.6 * pop, alpha: pop };
    }
    case "suck": {
      const a = ((seed.angle + 140 * t) / 180) * Math.PI;
      const radius = size * (0.95 - 0.85 * t);
      return { x: Math.cos(a) * radius, y: Math.sin(a) * radius, scale: 1 - 0.8 * t, alpha: t < 0.2 ? t / 0.2 : 1 - t };
    }
  }
};

export class LegendaryHalo {
  readonly root = new Container();
  readonly baseSize: number;
  readonly school: School;
  private readonly glow: Sprite;
  private readonly accent = new Graphics();
  private readonly swarm: ParticleContainer | null;
  private readonly particles: HaloParticle[] = [];
  private readonly kind: ParticleKind;
  readonly tint: number;

  constructor(defId: string, school: School, size: number, particles: number) {
    const textures = haloTextures();
    this.school = school;
    this.baseSize = size;
    this.kind = PARTICLE_KIND[school];
    this.tint = hexToNumber(schools[school].stroke);
    this.root.eventMode = "none";
    this.glow = new Sprite(textures.glow);
    this.glow.anchor.set(0.5);
    this.glow.width = size * GLOW_SPAN;
    this.glow.height = size * GLOW_SPAN;
    this.glow.tint = school === "black" ? BLACK_CORE : this.tint;
    this.glow.blendMode = school === "black" ? "normal" : "add";
    drawAccent(this.accent, school, size);
    this.accent.blendMode = school === "black" ? "normal" : "add";
    this.root.addChild(this.glow, this.accent);
    if (particles > 0) {
      this.swarm = new ParticleContainer({
        texture: textures.dot,
        dynamicProperties: { position: true, vertex: true, color: true },
      });
      for (const seed of particleSeeds(defId, particles)) {
        const particle = new Particle({ texture: textures.dot, anchorX: 0.5, anchorY: 0.5 });
        particle.tint = school === "prismatic" ? 0xffffff : school === "red" ? 0xffb27a : this.tint;
        this.swarm.addParticle(particle);
        this.particles.push({ particle, seed });
      }
      this.root.addChild(this.swarm);
    } else {
      this.swarm = null;
    }
  }

  update(ms: number, motion: boolean): void {
    const frame = haloFrame(this.school, ms, motion);
    const glowSize = this.baseSize * GLOW_SPAN * frame.glowScale;
    this.glow.width = glowSize;
    this.glow.height = glowSize;
    this.glow.alpha = frame.glowAlpha;
    this.accent.rotation = frame.accentAngle;
    this.accent.alpha = frame.accentAlpha;
    this.accent.scale.set(frame.accentScale);
    this.accent.x = frame.accentX * this.baseSize;
    if (frame.hue !== null) {
      const hue = hueToRgb(frame.hue);
      this.glow.tint = hue;
      this.accent.tint = hue;
    }
    if (this.swarm === null) return;
    this.swarm.visible = motion;
    if (!motion) return;
    for (const { particle, seed } of this.particles) {
      const at = placeParticle(this.kind, seed, ms, this.baseSize);
      particle.x = at.x;
      particle.y = at.y;
      particle.scaleX = at.scale * DOT_SCALE;
      particle.scaleY = at.scale * DOT_SCALE;
      particle.alpha = Math.max(0, Math.min(1, at.alpha));
      if (this.school === "prismatic") particle.tint = hueToRgb(seed.angle + ms * 0.08);
    }
    this.swarm.update();
  }

  destroy(): void {
    this.root.destroy({ children: true });
  }
}

export interface HaloTarget {
  uid: string;
  defId: string;
  school: School;
}

export interface HaloRead {
  uid: string;
  school: School;
  tint: number;
}

export class HaloLayer {
  readonly root = new Container();
  private readonly halos = new Map<string, LegendaryHalo>();

  constructor() {
    this.root.eventMode = "none";
  }

  get count(): number {
    return this.halos.size;
  }

  sync(targets: readonly HaloTarget[], size: number, particles: number): void {
    const live = new Set<string>();
    for (const target of targets) {
      live.add(target.uid);
      if (this.halos.has(target.uid)) continue;
      const halo = new LegendaryHalo(target.defId, target.school, size, particles);
      this.root.addChild(halo.root);
      this.halos.set(target.uid, halo);
    }
    for (const [uid, halo] of this.halos) {
      if (live.has(uid)) continue;
      halo.destroy();
      this.halos.delete(uid);
    }
  }

  follow(sprites: ReadonlyMap<string, Sprite>, dragLayer: Container, ms: number, motion: boolean): void {
    for (const [uid, halo] of this.halos) {
      const sprite = sprites.get(uid);
      if (sprite === undefined || sprite.destroyed || !sprite.visible || sprite.parent === null) {
        halo.root.visible = false;
        continue;
      }
      const home = sprite.parent === dragLayer ? dragLayer : this.root;
      if (home === dragLayer) {
        if (halo.root.parent !== dragLayer || dragLayer.getChildIndex(halo.root) !== dragLayer.getChildIndex(sprite) - 1) {
          dragLayer.addChildAt(halo.root, dragLayer.getChildIndex(sprite));
        }
      } else if (halo.root.parent !== this.root) {
        this.root.addChild(halo.root);
      }
      halo.root.visible = true;
      halo.root.position.set(sprite.x, sprite.y);
      halo.root.scale.set(sprite.width / halo.baseSize);
      halo.root.alpha = sprite.alpha;
      halo.update(ms, motion);
    }
  }

  read(): HaloRead[] {
    return [...this.halos].map(([uid, halo]) => ({ uid, school: halo.school, tint: halo.tint }));
  }

  clear(): void {
    for (const halo of this.halos.values()) halo.destroy();
    this.halos.clear();
  }

  destroy(): void {
    this.clear();
    this.root.destroy({ children: true });
  }
}