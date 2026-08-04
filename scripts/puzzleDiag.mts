import { PUZZLES } from "../src/data/puzzles";
import {
  calibrationIssues,
  difficultyOf,
} from "../src/game/puzzles/difficulty";
import { puzzleTable } from "./puzzleTable";

for (const line of puzzleTable(PUZZLES)) console.log(line);

let bad = 0;
for (const puzzle of PUZZLES) {
  for (const issue of calibrationIssues(puzzle, difficultyOf(puzzle))) {
    console.error(`FAIL ${issue.id}: ${issue.problem}`);
    bad += 1;
  }
}
console.log(bad === 0 ? "\nALL OK" : `\n${String(bad)} problems`);
