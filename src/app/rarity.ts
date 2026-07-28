import { tokens } from "@/app/theme";
import { schools } from "@/data/schools";
import type { Rarity } from "@/types/content";

// Rarity frames borrow the live school palette so they re-skin with the theme.
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
