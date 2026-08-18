export type StatusKey = "burn" | "mark" | "jam" | "charge";

export type Statuses = Partial<Record<StatusKey, number>>;

export const STATUS_KEYS: readonly StatusKey[] = [
  "burn",
  "mark",
  "jam",
  "charge",
];

export const MARK_DEFAULT_MAGNITUDE = 2;

export const applyStatus = (
  statuses: Statuses,
  key: StatusKey,
  amount?: number,
): void => {
  if (key === "burn") {
    statuses.burn = (statuses.burn ?? 0) + (amount ?? 1);
    return;
  }
  if (key === "mark") {
    const magnitude = Math.max(1, amount ?? MARK_DEFAULT_MAGNITUDE);
    statuses.mark = Math.max(statuses.mark ?? 0, magnitude);
    return;
  }
  statuses[key] = 1;
};

export const markMagnitude = (statuses: Statuses): number => statuses.mark ?? 0;

export const clearMark = (statuses: Statuses): void => {
  delete statuses.mark;
};

export const consumeStatus = (
  statuses: Statuses,
  key: Exclude<StatusKey, "burn" | "mark">,
): boolean => {
  if (statuses[key] === undefined) return false;
  if (key === "jam") delete statuses.jam;
  else delete statuses.charge;
  return true;
};

export const tickBurn = (statuses: Statuses): number => {
  const burn = statuses.burn ?? 0;
  if (burn <= 0) return 0;
  if (burn === 1) delete statuses.burn;
  else statuses.burn = burn - 1;
  return burn;
};
