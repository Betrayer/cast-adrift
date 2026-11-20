import type { EnemyState } from "@/types/battle";

type Seated = Pick<EnemyState, "seat">;

export const enemySeatOf = (enemy: Seated, index: number): number => enemy.seat ?? index;

export const enemySeatCount = (enemies: readonly Seated[]): number =>
  enemies.reduce((count, enemy, index) => Math.max(count, enemySeatOf(enemy, index) + 1), 0);

export const nextEnemySeat = (enemies: readonly Pick<EnemyState, "seat" | "hp">[]): number => {
  const count = enemySeatCount(enemies);
  const held = new Set(enemies.flatMap((enemy, index) => (enemy.hp > 0 ? [enemySeatOf(enemy, index)] : [])));
  for (let seat = 0; seat < count; seat += 1) {
    if (!held.has(seat)) return seat;
  }
  return count;
};

export const aliveOnBoard = <T extends Pick<EnemyState, "seat" | "hp">>(enemies: readonly T[]): T[] =>
  enemies
    .map((enemy, index) => ({ enemy, index, seat: enemySeatOf(enemy, index) }))
    .filter((entry) => entry.enemy.hp > 0)
    .sort((a, b) => a.seat - b.seat || a.index - b.index)
    .map((entry) => entry.enemy);

export const seatOccupants = (enemies: readonly Seated[]): number[] => {
  const latest = new Map<number, number>();
  enemies.forEach((enemy, index) => {
    latest.set(enemySeatOf(enemy, index), index);
  });
  return [...latest.values()].sort((a, b) => a - b);
};
