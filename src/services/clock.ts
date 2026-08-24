export type ClockSource = () => number;

const systemClock: ClockSource = () => Date.now();

let source: ClockSource = systemClock;

export const now = (): number => source();

export const setClockSource = (next: ClockSource | null): void => {
  source = next ?? systemClock;
};
