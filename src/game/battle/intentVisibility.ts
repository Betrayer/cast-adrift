import { ascensionMods } from "@/data/ascension";
import { ENEMY_BY_ID } from "@/data/enemies";
import { intentHits } from "@/game/battle/enemyPhase";
import { patternFor } from "@/game/battle/spawn";
import type { BattleSnapshot, EnemyState } from "@/types/battle";
import type { Intent, PatternStep } from "@/types/content";

type VisibilityInput = Pick<BattleSnapshot, "ascension" | "enemies">;

export const hiddenIntentIds = (snapshot: VisibilityInput): ReadonlySet<string> => {
  const hidden = ascensionMods(snapshot.ascension).hiddenIntents;
  if (hidden <= 0) return new Set();
  const living = snapshot.enemies.filter((enemy) => enemy.hp > 0);
  return new Set(living.slice(-hidden).map((enemy) => enemy.id));
};

export const intentHidden = (snapshot: VisibilityInput, enemyId: string): boolean =>
  hiddenIntentIds(snapshot).has(enemyId);

const stepIntents = (step: PatternStep): readonly Intent[] => {
  if ("pick" in step) return step.pick.map(([intent]) => intent);
  if ("when" in step) return [step.then, step.else];
  return [step];
};

const hitTotal = (snapshot: BattleSnapshot, enemy: EnemyState, intent: Intent): number =>
  intentHits(snapshot, enemy, intent).reduce((sum, hit) => sum + hit, 0);

export const shownIntent = (
  snapshot: BattleSnapshot,
  enemy: EnemyState,
  hidden: ReadonlySet<string>,
): Intent => (hidden.has(enemy.id) ? presumedIntent(snapshot, enemy) : enemy.nextIntent);

export const presumedIntent = (snapshot: BattleSnapshot, enemy: EnemyState): Intent => {
  const def = ENEMY_BY_ID.get(enemy.defId);
  if (def === undefined) return { t: "idle" };
  let best: Intent = { t: "idle" };
  let heaviest = 0;
  for (const step of patternFor(def, enemy.phase, snapshot.ascension)) {
    for (const intent of stepIntents(step)) {
      const total = hitTotal(snapshot, enemy, intent);
      if (total > heaviest) {
        best = intent;
        heaviest = total;
      }
    }
  }
  return best;
};
