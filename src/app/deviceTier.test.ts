import { describe, expect, it } from 'vitest';
import { backdropMode, tierFor } from '@/app/deviceTier';

describe('device tier', () => {
  it('calls a four-core or two-gigabyte device low', () => {
    expect(tierFor({ cores: 4, memoryGb: 8 })).toBe('low');
    expect(tierFor({ cores: 8, memoryGb: 2 })).toBe('low');
    expect(tierFor({ cores: 2 })).toBe('low');
  });

  it('calls eight cores with eight gigabytes high', () => {
    expect(tierFor({ cores: 8, memoryGb: 8 })).toBe('high');
    expect(tierFor({ cores: 16 })).toBe('high');
  });

  it('calls everything between mid, and a silent browser mid', () => {
    expect(tierFor({ cores: 6, memoryGb: 4 })).toBe('mid');
    expect(tierFor({ cores: 8, memoryGb: 4 })).toBe('mid');
    expect(tierFor({})).toBe('mid');
  });
});

describe('backdrop mode', () => {
  it('runs the loop only with motion allowed on a capable device', () => {
    expect(backdropMode({ reduced: false, tier: 'high' })).toBe('live');
    expect(backdropMode({ reduced: false, tier: 'mid' })).toBe('live');
  });

  it('paints one still frame under reduced motion or on a low device', () => {
    expect(backdropMode({ reduced: true, tier: 'high' })).toBe('still');
    expect(backdropMode({ reduced: false, tier: 'low' })).toBe('still');
    expect(backdropMode({ reduced: true, tier: 'low' })).toBe('still');
  });
});
