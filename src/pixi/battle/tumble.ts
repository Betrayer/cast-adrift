import { Container, Sprite } from "pixi.js";
import type { Application, Texture, Ticker } from "pixi.js";
import type { RngStream } from "@/services/rng";
import { easeOutBack, type Tweens } from "@/pixi/tween";
import { partsEndMs, visibleFace } from "@/dice3d/dieRoll";
import type { DiePalette } from "@/dice3d/paint";
import { PolyDie, type PolyPart } from "@/dice3d/paintPixi";

type MatterModule = typeof import("matter-js");
type Engine = ReturnType<MatterModule["Engine"]["create"]>;
type Body = ReturnType<MatterModule["Bodies"]["rectangle"]>;

let matterModule: MatterModule | null = null;

const loadMatter = async (): Promise<MatterModule> => {
  if (matterModule === null) {
    const mod = await import("matter-js");
    matterModule = (mod as unknown as { default?: MatterModule }).default ?? mod;
  }
  return matterModule;
};

export interface TumbleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TumblePoint {
  x: number;
  y: number;
}

export interface TumbleDie {
  uid: string;
  texture: Texture;
  grid: TumblePoint;
  from?: TumblePoint;
  parts: readonly PolyPart[];
  palette: DiePalette;
}

interface TumbleBody {
  die: TumbleDie;
  body: Body;
  poly: PolyDie;
  sprite: Sprite | null;
}

const SETTLE_MS = 220;
const WALL = 60;
const NUDGE_SPEED = 3;

export class Tumble {
  private readonly app: Application;
  private readonly layer: Container;
  private readonly tweens: Tweens;
  private readonly vfx: RngStream;
  private readonly root = new Container();

  private matter: MatterModule | null = null;
  private engine: Engine | null = null;
  private bodies: TumbleBody[] = [];
  private elapsed = 0;
  private rollMs = 0;
  private running = false;
  private cancelled = false;
  private generation = 0;
  private onDone: (() => void) | null = null;
  private onFace: ((uid: string, face: string) => void) | null = null;
  private readonly tickerFn: (ticker: Ticker) => void;

  constructor(app: Application, layer: Container, tweens: Tweens, vfx: RngStream) {
    this.app = app;
    this.layer = layer;
    this.tweens = tweens;
    this.vfx = vfx;
    this.layer.addChild(this.root);
    this.tickerFn = this.step;
  }

  run(
    dice: readonly TumbleDie[],
    box: TumbleRect,
    size: number,
    onDone: () => void,
    onFace?: (uid: string, face: string) => void,
  ): void {
    this.reset();
    this.onDone = onDone;
    this.onFace = onFace ?? null;
    if (dice.length === 0) {
      this.finish();
      return;
    }
    void this.begin(dice, box, size, this.generation);
  }

  private async begin(
    dice: readonly TumbleDie[],
    box: TumbleRect,
    size: number,
    generation: number,
  ): Promise<void> {
    const Matter = await loadMatter();
    if (this.cancelled || generation !== this.generation) return;
    this.matter = Matter;
    const engine = Matter.Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;
    this.engine = engine;

    const walls = [
      Matter.Bodies.rectangle(box.x + box.w / 2, box.y - WALL / 2, box.w + WALL * 2, WALL, { isStatic: true }),
      Matter.Bodies.rectangle(box.x + box.w / 2, box.y + box.h + WALL / 2, box.w + WALL * 2, WALL, { isStatic: true }),
      Matter.Bodies.rectangle(box.x - WALL / 2, box.y + box.h / 2, WALL, box.h + WALL * 2, { isStatic: true }),
      Matter.Bodies.rectangle(box.x + box.w + WALL / 2, box.y + box.h / 2, WALL, box.h + WALL * 2, { isStatic: true }),
    ];
    Matter.Composite.add(engine.world, walls);

    for (const die of dice) {
      const spawn = die.from ?? {
        x: box.x + size + this.vfx.next() * Math.max(0, box.w - size * 2),
        y: box.y + size,
      };
      const body = Matter.Bodies.rectangle(spawn.x, spawn.y, size * 0.9, size * 0.9, {
        restitution: 0.6,
        frictionAir: 0.03,
        friction: 0.02,
      });
      Matter.Body.setVelocity(
        body,
        die.from === undefined
          ? { x: (this.vfx.next() - 0.5) * 12, y: 4 + this.vfx.next() * 4 }
          : { x: (this.vfx.next() - 0.5) * NUDGE_SPEED, y: (this.vfx.next() - 0.5) * NUDGE_SPEED },
      );
      Matter.Composite.add(engine.world, body);

      const poly = new PolyDie(die.parts.length);
      poly.view.position.set(spawn.x, spawn.y);
      poly.draw(die.parts, 0, die.palette);
      this.root.addChild(poly.view);
      this.bodies.push({ die, body, poly, sprite: null });
    }

    this.rollMs = Math.max(0, ...dice.map((die) => partsEndMs(die.parts)));
    this.elapsed = 0;
    this.running = true;
    this.app.ticker.add(this.tickerFn);
  }

  private readonly step = (ticker: Ticker): void => {
    if (!this.running || this.engine === null || this.matter === null) return;
    this.elapsed += ticker.deltaMS;
    this.matter.Engine.update(this.engine, Math.min(32, ticker.deltaMS));
    for (const { die, body, poly } of this.bodies) {
      poly.view.position.set(body.position.x, body.position.y);
      poly.draw(die.parts, this.elapsed, die.palette);
    }
    if (this.elapsed >= this.rollMs) this.settle();
  };

  private settle(): void {
    this.running = false;
    this.app.ticker.remove(this.tickerFn);
    if (this.bodies.length === 0) {
      this.finish();
      return;
    }
    let pending = this.bodies.length;
    const done = (): void => {
      pending -= 1;
      if (pending <= 0) this.finish();
    };
    for (const entry of this.bodies) {
      const { die, poly } = entry;
      this.onFace?.(die.uid, visibleFace(die.parts, this.rollMs + 1));
      const sprite = new Sprite(die.texture);
      sprite.anchor.set(0.5);
      sprite.position.set(poly.view.x, poly.view.y);
      this.root.addChild(sprite);
      poly.destroy();
      entry.sprite = sprite;
      this.tweens.to(sprite, { x: die.grid.x, y: die.grid.y }, SETTLE_MS, easeOutBack, done);
    }
  }

  private finish(): void {
    this.clearWorld();
    const cb = this.onDone;
    this.onDone = null;
    this.onFace = null;
    if (!this.cancelled && cb !== null) cb();
  }

  private clearWorld(): void {
    this.running = false;
    this.app.ticker.remove(this.tickerFn);
    for (const { poly, sprite } of this.bodies) {
      if (!poly.view.destroyed) poly.destroy();
      sprite?.destroy();
    }
    this.bodies = [];
    if (this.engine !== null && this.matter !== null) {
      this.matter.Composite.clear(this.engine.world, false);
      this.matter.Engine.clear(this.engine);
    }
    this.engine = null;
  }

  private reset(): void {
    this.generation += 1;
    this.cancelled = false;
    this.clearWorld();
  }

  cancel(): void {
    this.generation += 1;
    this.cancelled = true;
    this.onDone = null;
    this.onFace = null;
    this.clearWorld();
  }

  destroy(): void {
    this.cancelled = true;
    this.clearWorld();
    this.root.destroy({ children: true });
  }
}
