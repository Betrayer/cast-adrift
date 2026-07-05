import { Container, Sprite } from "pixi.js";
import type { Application, Texture, Ticker } from "pixi.js";
import type { RngStream } from "@/services/rng";
import { easeOutBack, type Tweens } from "@/pixi/tween";

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

export interface TumbleDie {
  uid: string;
  texture: Texture;
  grid: { x: number; y: number };
}

const SETTLE_SPEED = 0.05;
const CAP_MS = 1600;
const SETTLE_MS = 220;
const WALL = 60;

export class Tumble {
  private readonly app: Application;
  private readonly layer: Container;
  private readonly tweens: Tweens;
  private readonly vfx: RngStream;
  private readonly root = new Container();

  private matter: MatterModule | null = null;
  private engine: Engine | null = null;
  private bodies: { body: Body; sprite: Sprite }[] = [];
  private elapsed = 0;
  private running = false;
  private cancelled = false;
  private onDone: (() => void) | null = null;
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
  ): void {
    this.reset();
    this.onDone = onDone;
    if (dice.length === 0) {
      this.finish();
      return;
    }
    void this.begin(dice, box, size);
  }

  private async begin(
    dice: readonly TumbleDie[],
    box: TumbleRect,
    size: number,
  ): Promise<void> {
    const Matter = await loadMatter();
    if (this.cancelled) return;
    this.matter = Matter;
    this.dieList = [...dice];
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
      const spawnX = box.x + size + this.vfx.next() * (box.w - size * 2);
      const spawnY = box.y + size;
      const body = Matter.Bodies.rectangle(spawnX, spawnY, size * 0.9, size * 0.9, {
        restitution: 0.6,
        frictionAir: 0.03,
        friction: 0.02,
      });
      Matter.Body.setVelocity(body, {
        x: (this.vfx.next() - 0.5) * 12,
        y: 4 + this.vfx.next() * 4,
      });
      Matter.Body.setAngularVelocity(body, (this.vfx.next() - 0.5) * 0.4);
      Matter.Composite.add(engine.world, body);

      const sprite = new Sprite(die.texture);
      sprite.anchor.set(0.5);
      sprite.position.set(spawnX, spawnY);
      this.root.addChild(sprite);
      this.bodies.push({ body, sprite });
    }

    this.elapsed = 0;
    this.running = true;
    this.app.ticker.add(this.tickerFn);
  }

  private readonly step = (ticker: Ticker): void => {
    if (!this.running || this.engine === null || this.matter === null) return;
    this.elapsed += ticker.deltaMS;
    this.matter.Engine.update(this.engine, Math.min(32, ticker.deltaMS));
    let maxSpeed = 0;
    for (const { body, sprite } of this.bodies) {
      sprite.position.set(body.position.x, body.position.y);
      sprite.rotation = body.angle;
      maxSpeed = Math.max(maxSpeed, body.speed);
    }
    if (maxSpeed < SETTLE_SPEED || this.elapsed >= CAP_MS) {
      this.settle();
    }
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
    for (const [index, { sprite }] of this.bodies.entries()) {
      const die = this.dieAt(index);
      const target = die?.grid ?? { x: sprite.x, y: sprite.y };
      this.tweens.to(sprite, { x: target.x, y: target.y }, SETTLE_MS, easeOutBack);
      this.tweens.to(sprite, { rotation: 0 }, SETTLE_MS, easeOutBack, done);
    }
  }

  private dieList: TumbleDie[] = [];

  private dieAt(index: number): TumbleDie | undefined {
    return this.dieList[index];
  }

  private finish(): void {
    this.clearWorld();
    const cb = this.onDone;
    this.onDone = null;
    if (!this.cancelled && cb !== null) cb();
  }

  private clearWorld(): void {
    this.running = false;
    this.app.ticker.remove(this.tickerFn);
    for (const { sprite } of this.bodies) sprite.destroy();
    this.bodies = [];
    this.dieList = [];
    if (this.engine !== null && this.matter !== null) {
      this.matter.Composite.clear(this.engine.world, false);
      this.matter.Engine.clear(this.engine);
    }
    this.engine = null;
  }

  private reset(): void {
    this.cancelled = false;
    this.clearWorld();
  }

  cancel(): void {
    if (this.bodies.length === 0 && !this.running) return;
    this.cancelled = true;
    this.clearWorld();
    this.onDone = null;
  }

  destroy(): void {
    this.cancelled = true;
    this.clearWorld();
    this.root.destroy({ children: true });
  }
}
