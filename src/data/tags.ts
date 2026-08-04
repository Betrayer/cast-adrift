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
  | "dice";

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
];

export const isContentTag = (value: string): value is ContentTag =>
  (CONTENT_TAGS as readonly string[]).includes(value);
