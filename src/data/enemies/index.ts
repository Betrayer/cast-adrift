import { BOSSES } from "@/data/enemies/bosses";
import { DRIFTER_ENEMIES } from "@/data/enemies/drifters";
import { ELITE_ENEMIES } from "@/data/enemies/elites";
import { MINIBOSSES } from "@/data/enemies/minibosses";
import { SECTOR1_ENEMIES } from "@/data/enemies/sector1";
import { SECTOR2_ENEMIES } from "@/data/enemies/sector2";
import { SECTOR3_ENEMIES } from "@/data/enemies/sector3";
import { SECTOR4_ENEMIES } from "@/data/enemies/sector4";
import { SECTOR5_ENEMIES } from "@/data/enemies/sector5";
import { SECTOR6_ENEMIES } from "@/data/enemies/sector6";
import type { EnemyDef } from "@/types/content";

export const BASE_ENEMIES: readonly EnemyDef[] = [
  ...SECTOR1_ENEMIES,
  ...SECTOR2_ENEMIES,
  ...SECTOR3_ENEMIES,
  ...SECTOR4_ENEMIES,
  ...SECTOR5_ENEMIES,
  ...SECTOR6_ENEMIES,
  ...DRIFTER_ENEMIES,
];

export const SECTOR_ROSTERS: readonly (readonly EnemyDef[])[] = [
  SECTOR1_ENEMIES,
  SECTOR2_ENEMIES,
  SECTOR3_ENEMIES,
  SECTOR4_ENEMIES,
  SECTOR5_ENEMIES,
  SECTOR6_ENEMIES,
];

export const ALL_ENEMIES: readonly EnemyDef[] = [
  ...BASE_ENEMIES,
  ...ELITE_ENEMIES,
  ...MINIBOSSES,
  ...BOSSES,
];

export const ENEMY_BY_ID: ReadonlyMap<string, EnemyDef> = new Map(
  ALL_ENEMIES.map((def) => [def.id, def]),
);

export const ENCOUNTER_GROUPS: Readonly<Record<string, readonly string[]>> = {
  mineCluster: ["mine", "mine", "mine"],
};

export const isEncounterGroup = (id: string): boolean =>
  Object.hasOwn(ENCOUNTER_GROUPS, id);

export const expandEncounterIds = (enemyIds: readonly string[]): string[] =>
  enemyIds.flatMap((id) => {
    const group = isEncounterGroup(id) ? ENCOUNTER_GROUPS[id] : undefined;
    return group === undefined ? [id] : [...group];
  });

export { BOSSES, BOSS_BY_ID } from "@/data/enemies/bosses";
export { DRIFTER_ENEMIES } from "@/data/enemies/drifters";
export { ELITE_ENEMIES } from "@/data/enemies/elites";
export { MINIBOSSES } from "@/data/enemies/minibosses";
export { SECTOR1_ENEMIES } from "@/data/enemies/sector1";
export { SECTOR2_ENEMIES } from "@/data/enemies/sector2";
export { SECTOR3_ENEMIES } from "@/data/enemies/sector3";
export { SECTOR4_ENEMIES } from "@/data/enemies/sector4";
export { SECTOR5_ENEMIES } from "@/data/enemies/sector5";
export { SECTOR6_ENEMIES } from "@/data/enemies/sector6";
