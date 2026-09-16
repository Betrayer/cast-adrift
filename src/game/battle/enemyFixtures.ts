import { afterAll } from "vitest";
import { ENEMY_BY_ID } from "@/data/enemies";
import type { EnemyDef } from "@/types/content";

export const enemyFixture = (
  over: Partial<EnemyDef> & { id: string },
): EnemyDef => ({
  name: `content:enemies.${over.id}`,
  signature: `content:signature.${over.id}`,
  claims: [],
  hp: 40,
  pattern: [{ t: "attack", n: 4 }],
  ...over,
});

export const registerEnemyFixtures = (defs: readonly EnemyDef[]): void => {
  const registry = ENEMY_BY_ID as Map<string, EnemyDef>;
  const shadowed = new Map<string, EnemyDef | undefined>();
  for (const def of defs) {
    shadowed.set(def.id, registry.get(def.id));
    registry.set(def.id, def);
  }
  afterAll(() => {
    for (const [id, previous] of shadowed) {
      if (previous === undefined) registry.delete(id);
      else registry.set(id, previous);
    }
  });
};
