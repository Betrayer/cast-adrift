import { describe, expect, it } from 'vitest';
import { fireMotionFlag, riseStyle, RISE_STEPS } from '@/app/motion';

describe('riseStyle', () => {
  it('maps an index onto the stagger variable', () => {
    expect(riseStyle(0)).toEqual({ '--ca-rise-index': '0' });
    expect(riseStyle(2)).toEqual({ '--ca-rise-index': '2' });
  });

  it('caps the stagger so long lists never cascade', () => {
    expect(riseStyle(40)).toEqual({
      '--ca-rise-index': String(RISE_STEPS),
    });
  });

  it('never goes negative', () => {
    expect(riseStyle(-3)).toEqual({ '--ca-rise-index': '0' });
  });
});

describe('fireMotionFlag', () => {
  it('re-arming the same flag cancels the timer that would cut it short', () => {
    const timers = new Map<number, () => void>();
    const attrs = new Map<string, string>();
    let nextId = 1;
    const node = {
      offsetWidth: 0,
      removeAttribute: (name: string) => {
        attrs.delete(name);
      },
      setAttribute: (name: string, value: string) => {
        attrs.set(name, value);
      },
    } as unknown as Element;
    const globals = globalThis as unknown as {
      window: {
        setTimeout: (fn: () => void, ms: number) => number;
        clearTimeout: (id: number) => void;
      };
    };
    const before = globals.window;
    globals.window = {
      setTimeout: (fn) => {
        const id = nextId;
        nextId += 1;
        timers.set(id, fn);
        return id;
      },
      clearTimeout: (id) => {
        timers.delete(id);
      },
    };

    fireMotionFlag(node, 'data-pop', 340);
    const stale = [...timers.keys()][0];
    fireMotionFlag(node, 'data-pop', 340);
    expect(stale).toBeDefined();
    expect(timers.has(stale ?? -1)).toBe(false);
    expect(attrs.get('data-pop')).toBe('1');

    for (const run of [...timers.values()]) run();
    expect(attrs.has('data-pop')).toBe(false);
    globals.window = before;
  });
});
