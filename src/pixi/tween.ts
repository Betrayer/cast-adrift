export type Ease = (t: number) => number;

export const linear: Ease = (t) => t;

export const easeOutQuad: Ease = (t) => 1 - (1 - t) * (1 - t);

export const easeOutBack: Ease = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

export const easeOutCubic: Ease = (t) => 1 - (1 - t) ** 3;

export const SPRING_DAMPING = 0.55;

export const SPRING_OMEGA = 12;

const springRaw = (t: number): number => {
  const zeta = SPRING_DAMPING;
  const omega = SPRING_OMEGA;
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * t);
  return (
    1 -
    decay *
      (Math.cos(damped * t) + ((zeta * omega) / damped) * Math.sin(damped * t))
  );
};

const SPRING_END = springRaw(1);

export const spring: Ease = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return springRaw(t) - (SPRING_END - 1) * t;
};

export type TweenProps<T> = {
  [K in keyof T & string as T[K] extends number ? K : never]?: number;
};

export const FX_GROUP = "fx";

export const UI_GROUP = "ui";

export interface TweenClock {
  add: (fn: (ticker: { deltaMS: number }) => void) => unknown;
  remove: (fn: (ticker: { deltaMS: number }) => void) => unknown;
}

export interface TweenOptions {
  delay?: number;
  group?: string;
  onUpdate?: (progress: number) => void;
  onDrop?: () => void;
}

export interface StaggerOptions extends TweenOptions {
  onComplete?: () => void;
}

export interface CountOptions extends TweenOptions {
  ease?: Ease;
  reduced?: boolean;
  onComplete?: () => void;
}

export interface SequenceStep {
  delay?: number;
  ms?: number;
  run?: () => void;
}

export interface TweenChannel {
  to: <T extends object>(
    target: T,
    props: TweenProps<T>,
    ms: number,
    ease?: Ease,
    onComplete?: () => void,
    options?: TweenOptions,
  ) => () => void;
  after: (ms: number, run: () => void) => () => void;
  sequence: (steps: readonly SequenceStep[]) => () => void;
}

interface ActiveTween {
  target: Record<string, number>;
  from: Record<string, number>;
  to: Record<string, number>;
  ms: number;
  delay: number;
  elapsed: number;
  group: string;
  started: boolean;
  ease: Ease;
  onComplete?: () => void;
  onUpdate?: (progress: number) => void;
  onDrop?: () => void;
}

interface ActiveTimer {
  remaining: number;
  group: string;
  run: () => void;
}

interface TweenTargetLifetime {
  destroyed?: unknown;
  _observer?: { destroyed?: unknown };
}

const targetIsDestroyed = (target: object): boolean => {
  const node = target as TweenTargetLifetime;
  return node.destroyed === true || node._observer?.destroyed === true;
};

const FRAME_MS = 16.7;

export const rafClock = (): TweenClock & { destroy: () => void } => {
  const listeners = new Set<(ticker: { deltaMS: number }) => void>();
  let handle = 0;
  let last = 0;
  const frame = (now: number): void => {
    const deltaMS = last === 0 ? FRAME_MS : Math.min(64, now - last);
    last = now;
    for (const listener of [...listeners]) listener({ deltaMS });
    if (!running || listeners.size === 0) {
      stop();
      return;
    }
    handle = window.requestAnimationFrame(frame);
  };
  let running = false;
  const stop = (): void => {
    running = false;
    if (handle !== 0) window.cancelAnimationFrame(handle);
    handle = 0;
    last = 0;
  };
  return {
    add: (fn) => {
      listeners.add(fn);
      if (running) return;
      running = true;
      handle = window.requestAnimationFrame(frame);
    },
    remove: (fn) => {
      listeners.delete(fn);
      if (listeners.size === 0) stop();
    },
    destroy: () => {
      listeners.clear();
      stop();
    },
  };
};

export class Tweens {
  timeScale = 1;

  private readonly clock: TweenClock;
  private readonly active = new Set<ActiveTween>();
  private readonly timers = new Set<ActiveTimer>();
  private readonly groupScales = new Map<string, number>();
  private attached = false;

  constructor(clock: TweenClock) {
    this.clock = clock;
  }

  get busy(): boolean {
    return this.active.size > 0 || this.timers.size > 0;
  }

  private attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.clock.add(this.update);
  }

  private detachWhenIdle(): void {
    if (!this.attached || this.busy) return;
    this.attached = false;
    this.clock.remove(this.update);
  }

  setGroupScale(group: string, scale: number): void {
    this.groupScales.set(group, Math.max(0, scale));
  }

  groupScale(group: string): number {
    return this.groupScales.get(group) ?? 1;
  }

  channel(group: string): TweenChannel {
    return {
      to: (target, props, ms, ease, onComplete, options) =>
        this.to(target, props, ms, ease, onComplete, {
          ...options,
          group,
        }),
      after: (ms, run) => this.after(ms, run, { group }),
      sequence: (steps) => this.sequence(steps, { group }),
    };
  }

  to<T extends object>(
    target: T,
    props: TweenProps<T>,
    ms: number,
    ease: Ease = easeOutQuad,
    onComplete?: () => void,
    options: TweenOptions = {},
  ): () => void {
    const record = target as unknown as Record<string, number>;
    const from: Record<string, number> = {};
    const to: Record<string, number> = {};
    for (const [key, value] of Object.entries(props)) {
      if (typeof value !== "number") continue;
      from[key] = record[key] ?? 0;
      to[key] = value;
    }
    const tween: ActiveTween = {
      target: record,
      from,
      to,
      ms: Math.max(1, ms),
      delay: Math.max(0, options.delay ?? 0),
      elapsed: 0,
      group: options.group ?? FX_GROUP,
      started: false,
      ease,
      onComplete,
      onUpdate: options.onUpdate,
      onDrop: options.onDrop,
    };
    this.active.add(tween);
    this.attach();
    return () => {
      this.active.delete(tween);
    };
  }

  stagger<T extends object>(
    targets: readonly T[],
    props: TweenProps<T> | ((index: number) => TweenProps<T>),
    ms: number,
    ease: Ease = easeOutQuad,
    gap = 0,
    options: StaggerOptions = {},
  ): () => void {
    const base = Math.max(0, options.delay ?? 0);
    let remaining = targets.length;
    const finish = (): void => {
      remaining -= 1;
      if (remaining === 0) options.onComplete?.();
    };
    const cancels = targets.map((target, index) =>
      this.to(
        target,
        typeof props === "function" ? props(index) : props,
        ms,
        ease,
        finish,
        {
          group: options.group,
          onUpdate: options.onUpdate,
          onDrop: finish,
          delay: base + index * Math.max(0, gap),
        },
      ),
    );
    if (targets.length === 0) options.onComplete?.();
    return () => {
      for (const cancel of cancels) cancel();
    };
  }

  count(
    from: number,
    to: number,
    ms: number,
    write: (value: number) => void,
    options: CountOptions = {},
  ): () => void {
    const end = Math.round(to);
    if (options.reduced === true || ms <= 0 || from === to) {
      write(end);
      options.onComplete?.();
      return () => undefined;
    }
    const probe = { value: from };
    let shown = Math.round(from);
    write(shown);
    return this.to(
      probe,
      { value: to },
      ms,
      options.ease ?? easeOutCubic,
      () => {
        if (shown !== end) write(end);
        shown = end;
        options.onComplete?.();
      },
      {
        delay: options.delay,
        group: options.group,
        onUpdate: (progress) => {
          const next = progress >= 1 ? end : Math.round(probe.value);
          if (next !== shown) {
            shown = next;
            write(next);
          }
          options.onUpdate?.(progress);
        },
      },
    );
  }

  after(ms: number, run: () => void, options: TweenOptions = {}): () => void {
    const timer: ActiveTimer = {
      remaining: Math.max(0, ms) + Math.max(0, options.delay ?? 0),
      group: options.group ?? FX_GROUP,
      run,
    };
    this.timers.add(timer);
    this.attach();
    return () => {
      this.timers.delete(timer);
    };
  }

  sequence(
    steps: readonly SequenceStep[],
    options: TweenOptions = {},
  ): () => void {
    const cancels: (() => void)[] = [];
    let at = Math.max(0, options.delay ?? 0);
    for (const step of steps) {
      at += Math.max(0, step.delay ?? 0);
      const run = step.run;
      if (run !== undefined) {
        cancels.push(this.after(at, run, { group: options.group }));
      }
      at += Math.max(0, step.ms ?? 0);
    }
    return () => {
      for (const cancel of cancels) cancel();
      cancels.length = 0;
    };
  }

  private scaleFor(group: string): number {
    return this.timeScale * this.groupScale(group);
  }

  private readonly update = (ticker: { deltaMS: number }): void => {
    for (const timer of [...this.timers]) {
      if (!this.timers.has(timer)) continue;
      const scale = this.scaleFor(timer.group);
      if (scale <= 0) continue;
      timer.remaining -= ticker.deltaMS * scale;
      if (timer.remaining > 0) continue;
      this.timers.delete(timer);
      timer.run();
    }
    for (const tween of [...this.active]) {
      if (!this.active.has(tween)) continue;
      if (targetIsDestroyed(tween.target)) {
        this.active.delete(tween);
        tween.onDrop?.();
        continue;
      }
      const scale = this.scaleFor(tween.group);
      if (scale <= 0) continue;
      tween.elapsed += ticker.deltaMS * scale;
      if (tween.elapsed < tween.delay) continue;
      if (!tween.started) {
        tween.started = true;
        if (tween.delay > 0) {
          for (const key of Object.keys(tween.to)) {
            tween.from[key] = tween.target[key] ?? tween.from[key] ?? 0;
          }
        }
      }
      const t = Math.min(1, (tween.elapsed - tween.delay) / tween.ms);
      const k = tween.ease(t);
      for (const key of Object.keys(tween.to)) {
        const from = tween.from[key] ?? 0;
        const to = tween.to[key] ?? 0;
        tween.target[key] = t >= 1 ? to : from + (to - from) * k;
      }
      tween.onUpdate?.(t);
      if (!this.active.has(tween)) continue;
      if (t >= 1) {
        this.active.delete(tween);
        tween.onComplete?.();
      }
    }
    this.detachWhenIdle();
  };

  destroy(): void {
    if (this.attached) this.clock.remove(this.update);
    this.attached = false;
    this.active.clear();
    this.timers.clear();
    this.groupScales.clear();
  }
}

export interface RafTweens {
  clock: ReturnType<typeof rafClock>;
  tweens: Tweens;
  destroy: () => void;
}

export const rafTweens = (): RafTweens => {
  const clock = rafClock();
  const tweens = new Tweens(clock);
  return {
    clock,
    tweens,
    destroy: () => {
      tweens.destroy();
      clock.destroy();
    },
  };
};
