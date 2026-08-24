import type {
  Beat,
  BattleLogEntry,
  EnemyBeat,
  EnemyState,
  ResolutionBundle,
} from "@/types/battle";

export const BATTLE_LOG_CAP = 80;

export interface LogContext {
  turn: number;
  seq: number;
  enemies: readonly EnemyState[];
}

const defIdOf = (
  enemies: readonly EnemyState[],
  id: string,
  fallback: readonly EnemyState[],
): string =>
  enemies.find((enemy) => enemy.id === id)?.defId ??
  fallback.find((enemy) => enemy.id === id)?.defId ??
  id;

const playerEntry = (
  beat: Beat,
  ctx: LogContext,
  index: number,
): BattleLogEntry => ({
  id: `${String(ctx.seq)}-y${String(index)}`,
  turn: ctx.turn,
  side: "you",
  kind: beat.kind,
  actor: beat.slot,
  amount: beat.amount,
  hull: beat.overflowHull ?? 0,
  shield: 0,
  dodged: 0,
  glanced: 0,
});

const enemyEntry = (
  beat: EnemyBeat,
  ctx: LogContext,
  index: number,
): BattleLogEntry => ({
  id: `${String(ctx.seq)}-f${String(index)}`,
  turn: ctx.turn,
  side: "foe",
  kind: beat.kind,
  actor: defIdOf(ctx.enemies, beat.enemyId, beat.after.enemies),
  amount: beat.amount,
  hull: beat.hullDamage,
  shield: beat.shieldDamage,
  dodged: beat.dodged ?? 0,
  glanced: beat.glanced ?? 0,
});

export const logEntriesFrom = (
  bundle: ResolutionBundle,
  ctx: LogContext,
): BattleLogEntry[] => [
  ...bundle.beats.map((beat, index) => playerEntry(beat, ctx, index)),
  ...bundle.enemyBeats.map((beat, index) => enemyEntry(beat, ctx, index)),
];

export const appendLog = (
  previous: readonly BattleLogEntry[],
  entries: readonly BattleLogEntry[],
): BattleLogEntry[] => {
  const merged = [...previous, ...entries];
  return merged.length <= BATTLE_LOG_CAP
    ? merged
    : merged.slice(merged.length - BATTLE_LOG_CAP);
};

export const logTurns = (
  entries: readonly BattleLogEntry[],
): { turn: number; entries: BattleLogEntry[] }[] => {
  const turns: { turn: number; entries: BattleLogEntry[] }[] = [];
  for (const entry of entries) {
    const last = turns[turns.length - 1];
    if (last !== undefined && last.turn === entry.turn) last.entries.push(entry);
    else turns.push({ turn: entry.turn, entries: [entry] });
  }
  return turns;
};
