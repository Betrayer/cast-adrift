import type { OverlayDie } from "@/components/DiceRollOverlay";
import { DIE_BY_ID } from "@/data/dice";
import { dieFaces, dieTier, type HandDie } from "@/game/dice/tier";

export const showcaseDie = (die: HandDie, key: string): OverlayDie | null => {
  const def = DIE_BY_ID.get(die.defId);
  if (def === undefined) return null;
  const tier = dieTier(die);
  const faces = dieFaces(die);
  return {
    key,
    defId: die.defId,
    tier,
    faces,
    school: def.school,
    value: faces === undefined ? tier : Math.max(...faces),
  };
};
