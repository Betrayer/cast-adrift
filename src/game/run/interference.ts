export const INTERFERENCE_STREAK_THRESHOLD = 3;

export const interferenceStacksForStreak = (streak: number): number =>
  Math.max(0, streak - (INTERFERENCE_STREAK_THRESHOLD - 1));

export const interferenceImminent = (streak: number): boolean =>
  streak >= INTERFERENCE_STREAK_THRESHOLD - 1;
