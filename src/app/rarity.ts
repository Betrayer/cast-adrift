import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import type { DieItemDef, Rarity } from "@/types/content";

export const rarityColor = (rarity: Rarity): string => {
  switch (rarity) {
    case "common":
      return tokens.line;
    case "uncommon":
      return schools.blue.stroke;
    case "rare":
      return schools.black.stroke;
    case "legendary":
      return tokens.amber;
  }
};

export const dieFrameColor = (def: Pick<DieItemDef, "rarity" | "school">): string =>
  def.rarity === "legendary" ? schools[def.school].stroke : rarityColor(def.rarity);
