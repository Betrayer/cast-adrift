import { describe, expect, it } from 'vitest';
import type { EnemyState } from '@/types/battle';
import { focusedEnemyIn } from './EnemyDetail';

const enemyAt = (id: string, hp: number): EnemyState => ({
  id,
  defId: 'raider',
  hp,
  hpMax: 26,
  shield: 0,
  intentIndex: 0,
  nextIntent: { t: 'attack', n: 8 },
  statuses: {},
  subsystems: [],
  phase: 0,
});

describe('focusedEnemyIn', () => {
  it('resolves a live focused enemy', () => {
    const enemies = [enemyAt('enemy-0', 26), enemyAt('enemy-1', 12)];
    expect(focusedEnemyIn(enemies, 'enemy-1')?.id).toBe('enemy-1');
  });

  it('drops the focus once the enemy is dead', () => {
    const enemies = [enemyAt('enemy-0', 0), enemyAt('enemy-1', 12)];
    expect(focusedEnemyIn(enemies, 'enemy-0')).toBeNull();
  });

  it('resolves nothing without a focus', () => {
    expect(focusedEnemyIn([enemyAt('enemy-0', 26)], null)).toBeNull();
  });

  it('resolves nothing for an id the battle does not carry', () => {
    expect(focusedEnemyIn([enemyAt('enemy-0', 26)], 'enemy-3')).toBeNull();
  });
});
