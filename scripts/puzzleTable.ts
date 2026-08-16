import type { PuzzleDef } from "../src/data/puzzles";
import { difficultyOf } from "../src/game/puzzles/difficulty";

const pad = (s: string, n: number): string => s.padEnd(n);
const num = (s: string, n: number): string => s.padStart(n);
const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;

export const puzzleTable = (puzzles: readonly PuzzleDef[]): string[] => {
  const rows: string[] = [
    `${pad("id", 16)}${pad("arch", 12)}${num("T", 2)}${num("calc", 5)}${num("boards", 8)}${num("place", 7)}${num("sol", 5)}${num("unguided", 10)}${num("attempt", 9)}${num("budget", 8)}  notes`,
  ];
  for (const puzzle of puzzles) {
    const d = difficultyOf(puzzle);
    const notes: string[] = [];
    if (d.floorWinnable) notes.push("FLOOR-WINNABLE");
    if (d.computedTier !== puzzle.tier) notes.push("TIER-MISMATCH");
    if (d.arch === "deduction") notes.push(`search ${d.searchSize.toFixed(1)}`);
    if (d.stepRates.length > 0) {
      notes.push(`steps ${d.stepRates.map((r) => pct(r)).join("/")}`);
    }
    rows.push(
      `${pad(puzzle.id, 16)}${pad(d.arch, 12)}${num(String(puzzle.tier), 2)}${num(String(d.computedTier), 5)}${num(String(d.boards), 8)}${num(String(d.placements), 7)}${num(String(d.solutions), 5)}${num(pct(d.unguidedShare), 10)}${num(pct(d.attemptWin), 9)}${num(pct(d.budgetedSolve), 8)}  ${notes.join(" · ")}`,
    );
  }
  return rows;
};
