import { describe, expect, it } from 'vitest';
import { riseStyle, RISE_STEPS } from '@/app/motion';

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
