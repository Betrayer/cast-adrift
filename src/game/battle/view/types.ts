import type { PerkTrait } from "@/data/perks/types";
import type {
  BattlePhase,
  BattleSnapshot,
  CheckStep,
} from "@/types/battle";

export interface BattleBoard extends BattleSnapshot {
  phase: BattlePhase;
  rerollMode: boolean;
  rerollsLeft: number;
  rerollSize: number;
  rerollSelection: readonly string[];
  reserveCap: number;
  freeNudges: number;
  selectedDieUid: string | null;
  swapSourceUid: string | null;
  spentGrants: readonly string[];
  fateUses: number;
  forcedTraits: readonly PerkTrait[];
  checkSteps: readonly CheckStep[] | null;
  checkIndex: number;
}
