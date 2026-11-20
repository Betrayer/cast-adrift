import type { BattleCtx } from "@/game/effects";
import { pickShape } from "@/stores/shape";
import type { BattleValues } from "@/stores/battleValues";
import type { BattleSnapshot } from "@/types/battle";

const BATTLE_SNAPSHOT_KEYS = [
  "turn", "hull", "hullMax", "shield", "shieldPersist", "charge", "scrap",
  "runScrap", "tide", "interference", "perks", "chartPicks", "mutators",
  "modules", "officers", "echo", "engravings", "flags", "counters",
  "runCounters", "exceedCap", "scheduled", "grants", "shipId", "chargeCap",
  "sacrificePool", "bloodReactorUsed", "passiveUsed", "burnDoubleUsed",
  "dice", "slots", "enemies", "targetId", "evasion", "nextTurnMods",
  "nextRollBonus", "blockedSlots", "shrunkSlots", "lockedDice", "cursedDice",
  "pendingHijack", "resonance", "survivedLethal", "lastPlayerDamage",
  "stolenScrap", "pendingTwist", "pendingSwap", "pendingStorm", "pendingAdds",
  "reinforcements", "partsDowned", "ascension", "sectorHpPct", "sectorDmgPct", "enemyHpPct",
  "inverted", "nodeStorm", "foldedTurns", "overflowShieldUsed", "pierceUsed",
  "outcome", "passiveTier", "firstHitSpent", "blackBoxSpent",
] as const satisfies readonly (keyof BattleSnapshot)[];

type NoUncoveredKeys<T extends never> = T;

export type UncoveredSnapshotKey = Exclude<
  keyof BattleSnapshot,
  (typeof BATTLE_SNAPSHOT_KEYS)[number]
>;

export type AssertSnapshotComplete = NoUncoveredKeys<UncoveredSnapshotKey>;

export const battleSnapshot = (s: BattleSnapshot): BattleSnapshot =>
  pickShape(BATTLE_SNAPSHOT_KEYS, s);

export const fromSnapshot = (snap: BattleSnapshot): Partial<BattleValues> => ({
  turn: snap.turn,
  hull: snap.hull,
  hullMax: snap.hullMax,
  shield: snap.shield,
  shieldPersist: snap.shieldPersist,
  charge: snap.charge,
  scrap: snap.scrap,
  runScrap: snap.runScrap,
  tide: snap.tide,
  interference: snap.interference,
  perks: snap.perks,
  chartPicks: snap.chartPicks ?? [],
  mutators: snap.mutators ?? [],
  modules: snap.modules ?? [],
  officers: snap.officers ?? [],
  echo: snap.echo,
  engravings: snap.engravings ?? {},
  flags: snap.flags ?? [],
  counters: snap.counters ?? {},
  runCounters: snap.runCounters ?? {},
  exceedCap: snap.exceedCap ?? [],
  scheduled: snap.scheduled ?? [],
  grants: snap.grants ?? {},
  chargeCap: snap.chargeCap,
  sacrificePool: snap.sacrificePool,
  bloodReactorUsed: snap.bloodReactorUsed,
  passiveUsed: snap.passiveUsed === true,
  passiveTier: snap.passiveTier === 2 ? 2 : 1,
  firstHitSpent: snap.firstHitSpent === true,
  blackBoxSpent: snap.blackBoxSpent === true,
  burnDoubleUsed: snap.burnDoubleUsed,
  dice: snap.dice,
  slots: snap.slots,
  enemies: snap.enemies,
  targetId: snap.targetId,
  evasion: snap.evasion,
  nextTurnMods: snap.nextTurnMods,
  nextRollBonus: snap.nextRollBonus,
  blockedSlots: snap.blockedSlots,
  shrunkSlots: snap.shrunkSlots,
  lockedDice: snap.lockedDice,
  cursedDice: snap.cursedDice ?? [],
  pendingHijack: snap.pendingHijack ?? 0,
  resonance: snap.resonance,
  survivedLethal: snap.survivedLethal,
  lastPlayerDamage: snap.lastPlayerDamage,
  stolenScrap: snap.stolenScrap,
  pendingTwist: snap.pendingTwist,
  pendingSwap: snap.pendingSwap,
  pendingStorm: snap.pendingStorm,
  pendingAdds: snap.pendingAdds ?? [],
  reinforcements: snap.reinforcements ?? [],
  partsDowned: snap.partsDowned ?? [],
  ascension: snap.ascension,
  sectorHpPct: snap.sectorHpPct,
  sectorDmgPct: snap.sectorDmgPct,
  enemyHpPct: snap.enemyHpPct,
  inverted: snap.inverted === true,
  nodeStorm: snap.nodeStorm === true,
  foldedTurns: snap.foldedTurns ?? 0,
  overflowShieldUsed: snap.overflowShieldUsed ?? false,
  pierceUsed: snap.pierceUsed ?? false,
  outcome: snap.outcome,
});

export const syncSnapshotFlags = (snapshot: BattleSnapshot, ctx: BattleCtx): void => {
  if (ctx.flags.size === (snapshot.flags?.length ?? 0)) return;
  snapshot.flags = [...ctx.flags];
};
