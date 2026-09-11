import type { EnemyState } from "@/types/battle";

export const aimedEnemy = (
  enemies: readonly EnemyState[],
  targetId: string | null,
): EnemyState | undefined => {
  const alive = enemies.filter((enemy) => enemy.hp > 0);
  if (targetId !== null) {
    const direct = alive.find((enemy) => enemy.id === targetId);
    if (direct !== undefined) return direct;
    const parentId = targetId.split(":")[0] ?? targetId;
    const parent = alive.find((enemy) => enemy.id === parentId);
    if (parent !== undefined) return parent;
  }
  return alive[0];
};
