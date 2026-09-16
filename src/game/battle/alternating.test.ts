import { describe, expect, it } from "vitest";
import { harnessBoard } from "@/game/battle/battleHarness";
import { applyWeaponDamage, isBodyImmune } from "@/game/battle/damage";
import { spawnEnemy } from "@/game/battle/setup";
import { createStream } from "@/services/rng";
import type { BattleSnapshot, EnemyState } from "@/types/battle";

const twinBoard = (): { snap: BattleSnapshot; enemy: EnemyState } => {
  const enemy = spawnEnemy("quarantineTwin", "enemy-0", createStream(11));
  return { snap: harnessBoard([enemy], [], { hull: 200, hullMax: 200 }), enemy };
};

const parts = (enemy: EnemyState) => {
  const a = enemy.subsystems[0];
  const b = enemy.subsystems[1];
  if (a === undefined || b === undefined) throw new Error("quarantineTwin parts");
  return { a, b };
};

describe("alternating", () => {
  it("still refuses a repeat hit while both hulls live", () => {
    const { snap, enemy } = twinBoard();
    const { a } = parts(enemy);

    expect(applyWeaponDamage(snap, { enemy, subsystem: a }, 3)).toBe(3);
    expect(applyWeaponDamage(snap, { enemy, subsystem: a }, 3)).toBe(0);
  });

  it("releases the lockout once only one hull is left to hit", () => {
    const { snap, enemy } = twinBoard();
    const { a, b } = parts(enemy);

    applyWeaponDamage(snap, { enemy, subsystem: a }, 99);
    expect(a.hp).toBe(0);
    applyWeaponDamage(snap, { enemy, subsystem: b }, 3);
    expect(enemy.lastHitKey).toBe(b.key);
    expect(isBodyImmune(snap, enemy)).toBe(true);

    expect(applyWeaponDamage(snap, { enemy, subsystem: b }, 99)).toBe(99);
    expect(b.hp).toBe(0);
    expect(isBodyImmune(snap, enemy)).toBe(false);
  });
});
