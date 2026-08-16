import { die } from "@/data/dice/builder";
import type { DieItemDef } from "@/types/content";

export const BASIC_DICE: readonly DieItemDef[] = [
  die("red-d6", 6, "red", "common", { tags: ["weapons"] }),
  die("blue-d6", 6, "blue", "common", { tags: ["shields"] }),
  die("grey-d4", 4, "grey", "common", { tags: ["swarm"] }),
  die("green-d4", 4, "green", "common", { tags: ["swarm", "engines"] }),
  die("yellow-d6", 6, "yellow", "common", { tags: ["scrap"] }),
  die("black-d6", 6, "black", "common", { tags: ["risk"] }),
];
