// Resonance Interference — the anti-dodge pressure valve. Leaving anomalies
// unsolved builds a streak; once it crosses the threshold, each further miss
// adds one stacking combat malus. Solving any anomaly clears it all.
//
// stacks = max(0, streak - 2): streak 3 -> 1 stack, streak 4 -> 2, ...
export const INTERFERENCE_STREAK_THRESHOLD = 3;

// +1 to every enemy attack per stack, applied where tide scaling is applied.
export const INTERFERENCE_PER_STACK = 1;

export const interferenceStacksForStreak = (streak: number): number =>
  Math.max(0, streak - (INTERFERENCE_STREAK_THRESHOLD - 1));

// Once the streak reaches this, leaving again begins interference.
export const interferenceImminent = (streak: number): boolean =>
  streak >= INTERFERENCE_STREAK_THRESHOLD - 1;
