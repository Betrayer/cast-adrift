import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import {
  aliveEnemies,
  applyJam,
  applyWeaponDamage,
  resolveWeaponTarget,
} from "@/game/battle/damage";
import { loadoutCensus, type TagCensus } from "@/game/effects/census";
import { createStream, fnv1a, type RngStream } from "@/services/rng";
import type { ContentTag } from "@/data/tags";
import { resonanceAtLeast } from "@/game/battle/resonance";
import { isInverted } from "@/game/battle/order";
import { applyStatus, type StatusKey } from "@/game/battle/statuses";
import { sourceTrait } from "@/game/run/runMods";
import type { EffectCtx } from "@/game/effects/ctx";
import {
  MAX_EFFECT_CHAIN,
  type Action,
  type CounterScope,
  type EffectTarget,
  type ExceedCapGrant,
  type GrantKey,
  type HookPayload,
  type ScheduledEffect,
  type ScheduleWhen,
} from "@/game/effects/types";
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
  crit: boolean;
  repeat: boolean;
}

interface PrimedSchool {
  n: number;
  max: boolean;
}

export interface GrowthRequest {
  cap: number;
  per: number;
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

const snapshotRngKey = (snapshot: BattleSnapshot): string =>
  [
    String(snapshot.turn),
    snapshot.dice.map((d) => `${d.uid}:${String(d.value)}`).join(","),
    snapshot.enemies.map((e) => `${e.id}:${String(e.hp)}`).join(","),
  ].join("|");

export class BattleCtx implements EffectCtx {
  readonly snapshot: BattleSnapshot;
  scope: ResolveScope | null = null;
  subjectDie: RolledDie | null = null;
  payload: HookPayload = {};
  readonly flags: Set<string>;
  readonly logs: string[] = [];
  readonly repeatedSlots = new Set<SlotId>();
  private readonly growthRequests = new Map<string, GrowthRequest>();
  private slotsResolved = 0;
  private effectStream: RngStream | undefined;
  private census: TagCensus | undefined;
  private readonly primed: Partial<Record<School, PrimedSchool>> = {};

  constructor(snapshot: BattleSnapshot, flags: Iterable<string> = []) {
    this.snapshot = snapshot;
    this.flags = new Set(flags);
  }

  findDie(uid: string): RolledDie | undefined {
    return this.snapshot.dice.find((d) => d.uid === uid);
  }

  currentSlot(): SlotId | undefined {
    return this.scope?.slotId ?? this.payload.slot;
  }

  slotMk(slot: SlotId): number {
    return this.snapshot.slots[slot]?.mk ?? 0;
  }

  subject(): RolledDie | null {
    return this.scope?.die ?? this.subjectDie ?? this.payload.die ?? null;
  }

  turn(): number {
    return this.snapshot.turn;
  }

  hullPct(): number {
    if (this.snapshot.hullMax <= 0) return 100;
    return (this.snapshot.hull * 100) / this.snapshot.hullMax;
  }

  hasFlag(key: string): boolean {
    return this.flags.has(key);
  }

  setFlag(key: string): void {
    this.flags.add(key);
  }

  resAtLeast(school: School, n: ResonanceThreshold): boolean {
    return resonanceAtLeast(this.snapshot.resonance, school, n);
  }

  firstOfTurn(): boolean {
    return this.scope !== null && this.slotsResolved === 1;
  }

  noteSlotResolved(): void {
    this.slotsResolved += 1;
  }

  chargeValue(): number {
    return this.snapshot.charge;
  }

  shieldValue(): number {
    return this.snapshot.shield;
  }

  tideValue(): number {
    return this.snapshot.tide + this.snapshot.interference;
  }

  invertedOrder(): boolean {
    return isInverted(this.snapshot);
  }

  counter(scope: CounterScope, key: string): number {
    const store =
      scope === "battle" ? this.snapshot.counters : this.snapshot.runCounters;
    return store?.[key] ?? 0;
  }

  bumpCounter(scope: CounterScope, key: string, delta: number): void {
    if (scope === "battle") {
      this.snapshot.counters = {
        ...this.snapshot.counters,
        [key]: (this.snapshot.counters?.[key] ?? 0) + delta,
      };
      return;
    }
    this.snapshot.runCounters = {
      ...this.snapshot.runCounters,
      [key]: (this.snapshot.runCounters?.[key] ?? 0) + delta,
    };
  }

  targetEnemy(): EnemyState | undefined {
    return this.currentTargetEnemy();
  }

  aliveEnemyCount(): number {
    return aliveEnemies(this.snapshot).length;
  }

  allDice(): readonly RolledDie[] {
    return this.snapshot.dice;
  }

  tagCount(tag: ContentTag): number {
    this.census ??= loadoutCensus({
      deckDefIds: this.snapshot.dice.map((d) => d.defId),
      perks: this.snapshot.perks,
      modules: this.snapshot.modules ?? [],
      ...(this.snapshot.engravings === undefined
        ? {}
        : { engravings: this.snapshot.engravings }),
    });
    return this.census[tag] ?? 0;
  }

  rng(): RngStream {
    this.effectStream ??= createStream(fnv1a(snapshotRngKey(this.snapshot)));
    return this.effectStream;
  }

  rerollDie(die: RolledDie): void {
    const value = rollBaseValue(die.defId, die.tier, this.rng());
    this.setDieValue(die, value + (die.growth ?? 0));
  }

  setCrit(): void {
    if (this.scope !== null) this.scope.crit = true;
  }

  grow(die: RolledDie, n: number, cap: number): void {
    const current = this.growthRequests.get(die.uid);
    this.growthRequests.set(die.uid, {
      cap: Math.max(cap, current?.cap ?? 0),
      per: Math.max(n, current?.per ?? 0),
    });
  }

  growthRequest(uid: string): GrowthRequest | undefined {
    return this.growthRequests.get(uid);
  }

  grant(what: GrantKey, n: number): void {
    this.snapshot.grants = {
      ...this.snapshot.grants,
      [what]: (this.snapshot.grants?.[what] ?? 0) + n,
    };
  }

  allowExceedCap(grant: ExceedCapGrant): void {
    this.snapshot.exceedCap = [...(this.snapshot.exceedCap ?? []), grant];
  }

  schedule(when: ScheduleWhen, turns: number, actions: readonly Action[]): void {
    const queued = this.snapshot.scheduled ?? [];
    const wanted = when === "nextTurn" ? 1 : Math.max(1, turns);
    const room = MAX_EFFECT_CHAIN - queued.length;
    if (wanted > room && import.meta.env?.DEV === true) {
      throw new Error("effects: scheduled chain exceeded MAX_EFFECT_CHAIN");
    }
    const span = Math.min(wanted, room);
    if (span <= 0) return;
    const entries: ScheduledEffect[] = [];
    for (let i = 1; i <= span; i += 1) {
      entries.push({ turn: this.snapshot.turn + i, do: actions });
    }
    this.snapshot.scheduled = [...queued, ...entries];
  }

  addTempDie(defId: string, turns?: number): void {
    const def = DIE_BY_ID.get(defId);
    if (def === undefined) return;
    this.snapshot.dice = [
      ...this.snapshot.dice,
      {
        uid: `temp-${String(this.snapshot.turn)}-${String(this.snapshot.dice.length)}`,
        defId,
        tier: def.tier,
        school: def.school,
        value: rollBaseValue(defId, def.tier, this.rng()),
        state: "tray",
        temp: true,
        ...(turns === undefined
          ? {}
          : { expiresTurn: this.snapshot.turn + turns }),
      },
    ];
    this.census = undefined;
  }

  removeTempDice(): void {
    this.snapshot.dice = this.snapshot.dice.filter((d) => d.temp !== true);
    this.census = undefined;
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
    if (s === "jam") {
      applyJam(this.snapshot, enemy);
      return;
    }
    let amount = n;
    if (
      s === "burn" &&
      !this.snapshot.burnDoubleUsed &&
      sourceTrait(this.snapshot, "burnDouble")
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
