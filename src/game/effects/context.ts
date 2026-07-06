import { DIE_BY_ID } from "@/data/dice";
import {
  aliveEnemies,
  applyWeaponDamage,
  resolveWeaponTarget,
} from "@/game/battle/damage";
import { resonanceAtLeast } from "@/game/battle/resonance";
import { applyStatus, type StatusKey } from "@/game/battle/statuses";
import { hasTrait } from "@/game/run/perkMods";
import type { EffectTarget } from "@/game/effects/types";
import type {
  BattleSnapshot,
  EnemyState,
  ResonanceThreshold,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";
import type { School } from "@/types/content";

export interface ResolveScope {
  slotId: SlotId;
  slot: SlotState;
  die: RolledDie;
  value: number;
  chargeMult: number;
  thresholdBonus: number;
  crit: boolean;
  repeat: boolean;
}

interface PrimedSchool {
  n: number;
  max: boolean;
}

export const dieFaceMax = (die: RolledDie): number => {
  const def = DIE_BY_ID.get(die.defId);
  const base = def?.faces !== undefined ? Math.max(...def.faces) : die.tier;
  return base + (die.growth ?? 0);
};

export const dieFaceMin = (die: RolledDie): number => {
  const def = DIE_BY_ID.get(die.defId);
  const base = def?.faces !== undefined ? Math.min(...def.faces) : 1;
  return base + (die.growth ?? 0);
};

export class BattleCtx {
  readonly snapshot: BattleSnapshot;
  scope: ResolveScope | null = null;
  subjectDie: RolledDie | null = null;
  readonly flags: Set<string>;
  readonly logs: string[] = [];
  readonly repeatedSlots = new Set<SlotId>();
  private readonly primed: Partial<Record<School, PrimedSchool>> = {};

  constructor(snapshot: BattleSnapshot, flags: Iterable<string> = []) {
    this.snapshot = snapshot;
    this.flags = new Set(flags);
  }

  findDie(uid: string): RolledDie | undefined {
    return this.snapshot.dice.find((d) => d.uid === uid);
  }

  resAtLeast(school: School, n: ResonanceThreshold): boolean {
    return resonanceAtLeast(this.snapshot.resonance, school, n);
  }

  private currentTargetEnemy(): EnemyState | undefined {
    const alive = aliveEnemies(this.snapshot);
    const targetId = this.snapshot.targetId;
    if (targetId !== null) {
      const direct = alive.find((e) => e.id === targetId);
      if (direct !== undefined) return direct;
      const parentId = targetId.split(":")[0] ?? targetId;
      const parent = alive.find((e) => e.id === parentId);
      if (parent !== undefined) return parent;
    }
    return alive[0];
  }

  dmg(n: number, target: EffectTarget = "target"): void {
    if (target !== "target") return;
    const weaponTarget = resolveWeaponTarget(this.snapshot);
    if (weaponTarget === undefined) return;
    applyWeaponDamage(this.snapshot, weaponTarget, n);
  }

  shield(n: number): void {
    this.snapshot.shield += n;
  }

  heal(n: number): void {
    this.snapshot.hull = Math.min(
      this.snapshot.hullMax,
      this.snapshot.hull + n,
    );
  }

  charge(n: number): void {
    this.snapshot.charge += n;
  }

  hull(n: number): void {
    this.snapshot.hull = Math.max(
      0,
      Math.min(this.snapshot.hullMax, this.snapshot.hull + n),
    );
  }

  scrap(n: number): void {
    this.snapshot.scrap += n;
  }

  modDieValue(die: RolledDie, n: number): void {
    if (this.scope !== null && this.scope.die.uid === die.uid) {
      this.scope.value += n;
      return;
    }
    die.value = Math.max(1, die.value + n);
  }

  setDieValue(die: RolledDie, n: number): void {
    if (this.scope !== null && this.scope.die.uid === die.uid) {
      this.scope.value = n;
      return;
    }
    die.value = Math.max(1, n);
  }

  addStatus(s: StatusKey, n: number, target: EffectTarget = "target"): void {
    if (target !== "target") return;
    const enemy = this.currentTargetEnemy();
    if (enemy === undefined) return;
    let amount = n;
    if (
      s === "burn" &&
      !this.snapshot.burnDoubleUsed &&
      hasTrait(this.snapshot.perks, "burnDouble")
    ) {
      amount = n * 2;
      this.snapshot.burnDoubleUsed = true;
    }
    applyStatus(enemy.statuses, s, amount);
  }

  primeSchool(school: School, n = 0, max = false): void {
    const existing = this.primed[school];
    this.primed[school] = {
      n: (existing?.n ?? 0) + n,
      max: (existing?.max ?? false) || max,
    };
  }

  consumePrime(school: School): PrimedSchool | undefined {
    const primed = this.primed[school];
    if (primed === undefined) return undefined;
    this.primed[school] = undefined;
    return primed;
  }

  requestRepeat(): void {
    if (this.scope === null) return;
    if (this.repeatedSlots.has(this.scope.slotId)) return;
    this.scope.repeat = true;
    this.repeatedSlots.add(this.scope.slotId);
  }

  log(message: string): void {
    this.logs.push(message);
  }
}
