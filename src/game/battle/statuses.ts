export type StatusKey = "burn" | "mark" | "jam" | "charge";

export type Statuses = Partial<Record<StatusKey, number>>;

export const STATUS_KEYS: readonly StatusKey[] = [
  "burn",
  "mark",
  "jam",
  "charge",
];

export const applyStatus = (
  statuses: Statuses,
  key: StatusKey,
  amount = 1,
): void => {
  if (key === "burn") {
    statuses.burn = (statuses.burn ?? 0) + amount;
    return;
  }
  statuses[key] = 1;
};

export const consumeStatus = (
  statuses: Statuses,
  key: Exclude<StatusKey, "burn">,
): boolean => {
  if (statuses[key] === undefined) return false;
  if (key === "mark") delete statuses.mark;
  else if (key === "jam") delete statuses.jam;
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
