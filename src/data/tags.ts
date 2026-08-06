export type ContentTag =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "black"
  | "grey"
  | "prismatic"
  | "weapons"
  | "shields"
  | "engines"
  | "sensors"
  | "reactor"
  | "spinal"
  | "repairBay"
  | "burn"
  | "crit"
  | "growth"
  | "reroll"
  | "charge"
  | "scrap"
  | "overcap"
  | "pierce"
  | "dodge"
  | "survival"
  | "control"
  | "dice"
  | "shieldwall"
  | "risk"
  | "swarm"
  | "spike"
  | "precision";

export const CONTENT_TAGS: readonly ContentTag[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
  "weapons",
  "shields",
  "engines",
  "sensors",
  "reactor",
  "spinal",
  "repairBay",
  "burn",
  "crit",
  "growth",
  "reroll",
  "charge",
  "scrap",
  "overcap",
  "pierce",
  "dodge",
  "survival",
  "control",
  "dice",
  "shieldwall",
  "risk",
  "swarm",
  "spike",
  "precision",
];

export const SCHOOL_TAGS: readonly ContentTag[] = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "grey",
  "prismatic",
];

export const SYSTEM_TAGS: readonly ContentTag[] = [
  "weapons",
  "shields",
  "engines",
  "sensors",
  "reactor",
  "spinal",
  "repairBay",
];

export const MECHANIC_TAGS: readonly ContentTag[] = [
  "burn",
  "crit",
  "growth",
  "reroll",
  "charge",
  "scrap",
  "overcap",
  "pierce",
  "dodge",
  "survival",
  "control",
  "dice",
  "shieldwall",
  "risk",
  "swarm",
  "spike",
  "precision",
];

export const isContentTag = (value: string): value is ContentTag =>
  (CONTENT_TAGS as readonly string[]).includes(value);
