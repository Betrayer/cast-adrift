import { Graphics, type Container } from "pixi.js";
import type { EnemyRole } from "@/types/content";

export interface BurstAccent {
  count: number;
  size: number;
  reach: number;
  ms: number;
  spread: number;
  bias: number;
  drop: number;
  inward: boolean;
}

const FULL_TURN = Math.PI * 2;

export const DEFAULT_BURST: BurstAccent = {
  count: 8,
  size: 2.5,
  reach: 54,
  ms: 420,
  spread: FULL_TURN,
  bias: 0.4,
  drop: 0,
  inward: false,
};

export const BURST_ACCENTS: Partial<Record<EnemyRole, BurstAccent>> = {
  swarm: {
    count: 14,
    size: 1.8,
    reach: 38,
    ms: 300,
    spread: FULL_TURN,
    bias: 0,
    drop: 0,
    inward: false,
  },
  bruiser: {
    count: 5,
    size: 5,
    reach: 46,
    ms: 620,
    spread: 2.4,
    bias: Math.PI / 2,
    drop: 26,
    inward: false,
  },
  anchor: {
    count: 10,
    size: 3,
    reach: 58,
    ms: 380,
    spread: FULL_TURN,
    bias: 0,
    drop: 0,
    inward: true,
  },
};

export const PART_BURST: BurstAccent = {
  count: 6,
  size: 2.2,
  reach: 34,
  ms: 340,
  spread: 0.9,
  bias: 0,
  drop: 0,
  inward: false,
};

export const burstAngle = (accent: BurstAccent, index: number): number => {
  if (accent.spread >= FULL_TURN) {
    return accent.bias + (index / Math.max(1, accent.count)) * FULL_TURN;
  }
  const step = accent.count <= 1 ? 0.5 : index / (accent.count - 1);
  return accent.bias + (step - 0.5) * accent.spread;
};

export class FxPool {
  private readonly dots: Graphics[] = [];
  private readonly glows: Graphics[] = [];
  private readonly cancels = new Map<Graphics, (() => void)[]>();

  constructor(layer: Container, dots: number, glows: number) {
    for (let i = 0; i < dots; i += 1) this.dots.push(this.build(layer));
    for (let i = 0; i < glows; i += 1) this.glows.push(this.build(layer));
  }

  takeDot(): Graphics | undefined {
    return this.take(this.dots);
  }

  takeGlow(): Graphics | undefined {
    return this.take(this.glows);
  }

  track(owner: Graphics, cancel: () => void): void {
    const handles = this.cancels.get(owner);
    if (handles === undefined) this.cancels.set(owner, [cancel]);
    else handles.push(cancel);
  }

  release(owner: Graphics): void {
    const handles = this.cancels.get(owner);
    if (handles === undefined) return;
    this.cancels.delete(owner);
    for (const cancel of handles) cancel();
  }

  reset(): void {
    for (const fx of this.all()) {
      this.release(fx);
      fx.clear();
      fx.visible = false;
    }
  }

  liveCount(): number {
    return this.all().filter((fx) => fx.visible).length;
  }

  totalCount(): number {
    return this.dots.length + this.glows.length;
  }

  handleCount(): number {
    let total = 0;
    for (const handles of this.cancels.values()) total += handles.length;
    return total;
  }

  private all(): Graphics[] {
    return [...this.dots, ...this.glows];
  }

  private build(layer: Container): Graphics {
    const fx = new Graphics();
    fx.visible = false;
    fx.eventMode = "none";
    layer.addChild(fx);
    return fx;
  }

  private take(pool: readonly Graphics[]): Graphics | undefined {
    const free = pool.find((fx) => !fx.visible);
    if (free === undefined) return undefined;
    this.release(free);
    free.clear();
    free.alpha = 1;
    free.scale.set(1);
    free.visible = true;
    return free;
  }
}
