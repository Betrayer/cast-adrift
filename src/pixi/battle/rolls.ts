import { seatCount, tableSizeFor } from "@/game/battle/table";
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

export type SceneChange = "rebuild" | "relayout" | "sync";

export interface SceneMarks {
  turn: number;
  ascension: number;
  enemies: readonly unknown[];
  slots: Readonly<Record<string, unknown>>;
  dice: readonly Pick<RolledDie, "uid" | "state" | "seat" | "temp" | "defId">[];
}

export const sceneChange = (state: SceneMarks, prev: SceneMarks): SceneChange => {
  if (
    state.turn !== prev.turn ||
    state.enemies.length !== prev.enemies.length ||
    Object.keys(state.slots).length !== Object.keys(prev.slots).length
  )
    return "rebuild";
  if (
    state.dice !== prev.dice &&
    seatCount(state.dice, tableSizeFor(state.ascension)) !==
      seatCount(prev.dice, tableSizeFor(prev.ascension))
  )
    return "relayout";
  return "sync";
};
