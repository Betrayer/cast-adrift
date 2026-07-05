import type { EnemyDef } from "@/types/content";

export const SECTOR1_ENEMIES: readonly EnemyDef[] = [
  {
    id: "scavDrone",
    name: "content:enemies.scavDrone",
    hp: 10,
    pattern: [
      { t: "multi", n: 3, k: 3 },
      { t: "attack", n: 4 },
    ],
  },
  {
    id: "raider",
    name: "content:enemies.raider",
    hp: 32,
    pattern: [
      { t: "multi", n: 5, k: 4 },
      { t: "multi", n: 5, k: 3 },
      { t: "shield", n: 6 },
    ],
  },
  {
    id: "shieldWarden",
    name: "content:enemies.shieldWarden",
    hp: 26,
    pattern: [
      { t: "shieldAll", n: 6 },
      { t: "multi", n: 4, k: 4 },
    ],
  },
  {
    id: "mine",
    name: "content:enemies.mine",
    hp: 2,
    env: true,
    pattern: [{ t: "attack", n: 1 }],
  },
  {
    id: "jammerCorvette",
    name: "content:enemies.jammerCorvette",
    hp: 24,
    pattern: [
      { t: "jamSlot" },
      { t: "multi", n: 4, k: 4 },
    ],
  },
  {
    id: "leechSkiff",
    name: "content:enemies.leechSkiff",
    hp: 22,
    pattern: [
      { t: "lockDie" },
      { t: "multi", n: 4, k: 3 },
    ],
  },
  {
    id: "choirZealot",
    name: "content:enemies.choirZealot",
    hp: 22,
    pattern: [
      { t: "charge" },
      { t: "multi", n: 3, k: 3 },
    ],
  },
  {
    id: "riftWasp",
    name: "content:enemies.riftWasp",
    hp: 18,
    onDeath: { t: "blockSlot", slot: "weaponA" },
    pattern: [{ t: "multi", n: 3, k: 4 }],
  },
  {
    id: "raiderAlpha",
    name: "content:enemies.raiderAlpha",
    hp: 30,
    elite: true,
    subsystems: [
      {
        id: "turret",
        name: "content:enemies.raiderAlpha-turret",
        hp: 10,
        aura: "atk+2",
      },
    ],
    pattern: [
      { t: "multi", n: 4, k: 4 },
      {
        pick: [
          [{ t: "multi", n: 4, k: 3 }, 2],
          [{ t: "shield", n: 6 }, 1],
        ],
      },
      {
        pick: [
          [{ t: "multi", n: 4, k: 4 }, 1],
          [{ t: "multi", n: 3, k: 4 }, 1],
        ],
      },
    ],
  },
];

export const ENEMY_BY_ID: ReadonlyMap<string, EnemyDef> = new Map(
  SECTOR1_ENEMIES.map((def) => [def.id, def]),
);

export const ENCOUNTER_GROUPS: Readonly<Record<string, readonly string[]>> = {
  mineCluster: ["mine", "mine", "mine"],
};

export const isEncounterGroup = (id: string): boolean =>
  Object.hasOwn(ENCOUNTER_GROUPS, id);

export const expandEncounterIds = (
  enemyIds: readonly string[],
): string[] =>
  enemyIds.flatMap((id) => {
    const group = isEncounterGroup(id) ? ENCOUNTER_GROUPS[id] : undefined;
    return group === undefined ? [id] : [...group];
  });
