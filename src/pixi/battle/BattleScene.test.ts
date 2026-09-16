import { describe, expect, it } from "vitest";
import { Container } from "pixi.js";
import {
  burstAngle,
  BURST_ACCENTS,
  DEFAULT_BURST,
  FxPool,
  PART_BURST,
  type BurstAccent,
} from "@/pixi/battle/BattleScene";
import { easeOutQuad, Tweens, type TweenClock } from "@/pixi/tween";

const FULL_TURN = Math.PI * 2;

const wrapped = (angle: number): number =>
  Math.round((((angle % FULL_TURN) + FULL_TURN) % FULL_TURN) * 1e6) / 1e6;

const headings = (accent: BurstAccent): number[] =>
  Array.from({ length: accent.count }, (_, i) => wrapped(burstAngle(accent, i)));

const ringAccents = (): BurstAccent[] =>
  [DEFAULT_BURST, ...Object.values(BURST_ACCENTS)].filter(
    (accent) => accent.spread >= FULL_TURN,
  );

describe("burstAngle", () => {
  it("gives every particle of a full-turn burst its own heading", () => {
    for (const accent of ringAccents()) {
      expect(new Set(headings(accent)).size).toBe(accent.count);
    }
  });

  it("spaces a full-turn burst evenly around the bias", () => {
    for (const accent of ringAccents()) {
      for (let i = 0; i < accent.count; i += 1) {
        expect(burstAngle(accent, i)).toBeCloseTo(
          accent.bias + (i / accent.count) * FULL_TURN,
          9,
        );
      }
    }
  });

  it("keeps an arc burst endpoint-inclusive across its spread", () => {
    const bruiser = BURST_ACCENTS.bruiser;
    expect(bruiser).toBeDefined();
    for (const accent of [PART_BURST, bruiser ?? PART_BURST]) {
      expect(burstAngle(accent, 0)).toBeCloseTo(
        accent.bias - accent.spread / 2,
        9,
      );
      expect(burstAngle(accent, accent.count - 1)).toBeCloseTo(
        accent.bias + accent.spread / 2,
        9,
      );
    }
  });

  it("sends a lone particle along the bias", () => {
    expect(burstAngle({ ...DEFAULT_BURST, count: 1 }, 0)).toBeCloseTo(
      DEFAULT_BURST.bias,
      9,
    );
    expect(burstAngle({ ...PART_BURST, count: 1 }, 0)).toBeCloseTo(
      PART_BURST.bias,
      9,
    );
  });
});

const manualClock = () => {
  let listener: ((ticker: { deltaMS: number }) => void) | null = null;
  const clock: TweenClock = {
    add: (fn) => {
      listener = fn;
    },
    remove: () => {
      listener = null;
    },
  };
  return {
    clock,
    step: (deltaMS: number): void => {
      listener?.({ deltaMS });
    },
  };
};

const poolOf = (dots: number, glows: number) => {
  const layer = new Container();
  return { layer, pool: new FxPool(layer, dots, glows) };
};

describe("FxPool", () => {
  it("builds every pooled graphic hidden inside the layer", () => {
    const { layer, pool } = poolOf(4, 2);
    expect(layer.children.length).toBe(6);
    expect(pool.totalCount()).toBe(6);
    expect(pool.liveCount()).toBe(0);
  });

  it("hands out a cleared, visible graphic from each pool", () => {
    const { pool } = poolOf(2, 1);
    const dot = pool.takeDot();
    const glow = pool.takeGlow();
    expect(dot?.visible).toBe(true);
    expect(glow?.visible).toBe(true);
    expect(dot?.alpha).toBe(1);
    expect(pool.liveCount()).toBe(2);
  });

  it("reset hides and clears the glow pool as well as the dots", () => {
    const { pool } = poolOf(2, 1);
    const dot = pool.takeDot();
    const glow = pool.takeGlow();
    expect(dot).toBeDefined();
    expect(glow).toBeDefined();
    pool.reset();
    expect(dot?.visible).toBe(false);
    expect(glow?.visible).toBe(false);
    expect(pool.liveCount()).toBe(0);
  });

  it("reset cancels a running glow fade instead of stranding it on screen", () => {
    const { clock, step } = manualClock();
    const tweens = new Tweens(clock);
    const { pool } = poolOf(2, 1);
    const glow = pool.takeGlow();
    expect(glow).toBeDefined();
    if (glow === undefined) return;
    glow.alpha = 0.14;
    pool.track(
      glow,
      tweens.to(glow, { alpha: 0 }, 320, easeOutQuad, () => {
        glow.visible = false;
      }),
    );
    step(80);
    expect(glow.visible).toBe(true);
    pool.reset();
    step(5000);
    expect(glow.visible).toBe(false);
  });

  it("releases the handles of a pooled graphic when it is handed out again", () => {
    const { pool } = poolOf(1, 0);
    const dot = pool.takeDot();
    expect(dot).toBeDefined();
    if (dot === undefined) return;
    let released = 0;
    pool.track(dot, () => {
      released += 1;
    });
    pool.track(dot, () => {
      released += 1;
    });
    expect(pool.handleCount()).toBe(2);
    dot.visible = false;
    expect(pool.takeDot()).toBe(dot);
    expect(released).toBe(2);
    expect(pool.handleCount()).toBe(0);
  });

  it("keeps the tracked handles bounded across a long battle", () => {
    const { pool } = poolOf(4, 1);
    for (let i = 0; i < 300; i += 1) {
      const dot = pool.takeDot();
      if (dot === undefined) break;
      pool.track(dot, () => undefined);
      pool.track(dot, () => undefined);
      dot.visible = false;
    }
    expect(pool.handleCount()).toBe(2);
  });

  it("stops a tween that is still driving a recycled graphic", () => {
    const { clock, step } = manualClock();
    const tweens = new Tweens(clock);
    const { pool } = poolOf(1, 0);
    const dot = pool.takeDot();
    expect(dot).toBeDefined();
    if (dot === undefined) return;
    dot.position.set(0, 0);
    pool.track(dot, tweens.to(dot, { x: 100 }, 400));
    step(200);
    dot.visible = false;
    const again = pool.takeDot();
    expect(again).toBe(dot);
    dot.position.set(0, 0);
    step(400);
    expect(dot.x).toBe(0);
  });
});
