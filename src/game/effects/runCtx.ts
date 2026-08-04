import { resonanceAtLeast } from "@/game/battle/resonance";
import {
  loadoutCensus,
  type LoadoutRef,
  type TagCensus,
} from "@/game/effects/census";
import type { EffectCtx } from "@/game/effects/ctx";
import type { CounterScope, HookPayload } from "@/game/effects/types";
import type { ContentTag } from "@/data/tags";
import type { ResonanceCensus, ResonanceThreshold } from "@/types/battle";
import type { School } from "@/types/content";

export interface RunCtxState {
  hull: number;
  hullMax: number;
  tide: number;
  interference: number;
  flagKeys: readonly string[];
  counters: Readonly<Record<string, number>>;
  resonance: ResonanceCensus;
  loadout: LoadoutRef;
}

export interface RunCtxDeltas {
  scrap: number;
  hull: number;
  flags: string[];
  counters: Record<string, number>;
}

export class RunCtx implements EffectCtx {
  payload: HookPayload = {};
  readonly logs: string[] = [];
  readonly deltas: RunCtxDeltas = {
    scrap: 0,
    hull: 0,
    flags: [],
    counters: {},
  };
  private readonly state: RunCtxState;
  private readonly flags: Set<string>;
  private census: TagCensus | undefined;

  constructor(state: RunCtxState) {
    this.state = state;
    this.flags = new Set(state.flagKeys);
  }

  log(message: string): void {
    this.logs.push(message);
  }

  hullPct(): number {
    if (this.state.hullMax <= 0) return 100;
    const hull = this.state.hull + this.deltas.hull;
    return (hull * 100) / this.state.hullMax;
  }

  resAtLeast(school: School, n: ResonanceThreshold): boolean {
    return resonanceAtLeast(this.state.resonance, school, n);
  }

  hasFlag(key: string): boolean {
    return this.flags.has(key);
  }

  setFlag(key: string): void {
    if (this.flags.has(key)) return;
    this.flags.add(key);
    this.deltas.flags.push(key);
  }

  tideValue(): number {
    return this.state.tide + this.state.interference;
  }

  tagCount(tag: ContentTag): number {
    this.census ??= loadoutCensus(this.state.loadout);
    return this.census[tag] ?? 0;
  }

  counter(scope: CounterScope, key: string): number {
    if (scope === "battle") return 0;
    return (this.state.counters[key] ?? 0) + (this.deltas.counters[key] ?? 0);
  }

  bumpCounter(scope: CounterScope, key: string, delta: number): void {
    if (scope === "battle") return;
    this.deltas.counters[key] = (this.deltas.counters[key] ?? 0) + delta;
  }

  scrap(n: number): void {
    this.deltas.scrap += n;
  }

  hull(n: number): void {
    this.deltas.hull += n;
  }

  heal(n: number): void {
    this.deltas.hull += n;
  }
}
