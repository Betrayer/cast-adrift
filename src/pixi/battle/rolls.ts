import type { RolledDie } from "@/types/battle";

export interface RollMarks {
  turn: number;
  rollSeq: number;
  rolledUids: readonly string[];
  dice: readonly Pick<RolledDie, "uid" | "temp">[];
}

export interface RolledChange {
  rolled: Set<string>;
  summoned: string[];
}

export const rolledBetween = (state: RollMarks, prev: RollMarks): RolledChange => {
  const rolled = new Set<string>();
  const summoned: string[] = [];
  if (state.turn !== prev.turn) return { rolled, summoned };
  if (state.rollSeq !== prev.rollSeq) for (const uid of state.rolledUids) rolled.add(uid);
  if (state.dice === prev.dice) return { rolled, summoned };
  const known = new Set(prev.dice.map((die) => die.uid));
  for (const die of state.dice) {
    if (die.temp !== true || known.has(die.uid)) continue;
    summoned.push(die.uid);
    rolled.add(die.uid);
  }
  return { rolled, summoned };
};
