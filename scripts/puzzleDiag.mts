import { PUZZLES } from "../src/data/puzzles";
import {
  difficultyReport,
  isAchievable,
  isTrivial,
  solutionCount,
  totalPlacements,
} from "../src/game/puzzles/evaluate";

const pad = (s: string, n: number): string => s.padEnd(n);

console.log(
  `${pad("id", 14)}${pad("arch", 12)}${pad("floor", 7)}${pad("mid", 6)}${pad("ceil", 7)}${pad("target", 8)}${pad("sol", 6)}${pad("tot", 6)}${pad("exReach", 9)}ach triv`,
);
for (const p of PUZZLES) {
  const r = difficultyReport(p);
  const ach = isAchievable(p);
  const triv = isTrivial(p);
  const tot = totalPlacements(p);
  const flags = `${ach ? "Y" : "N"}   ${triv ? "TRIVIAL!" : "ok"}`;
  console.log(
    `${pad(p.id, 14)}${pad(r.arch, 12)}${pad(String(r.floor), 7)}${pad(String(r.mid), 6)}${pad(String(r.ceil), 7)}${pad(String(r.target), 8)}${pad(String(r.solutions), 6)}${pad(String(tot), 6)}${pad(String(r.exactReachable), 9)}${flags}`,
  );
}

let bad = 0;
for (const p of PUZZLES) {
  if (!isAchievable(p)) {
    console.error(`FAIL ${p.id}: not achievable`);
    bad += 1;
  }
  if (isTrivial(p)) {
    console.error(`FAIL ${p.id}: trivial (free win)`);
    bad += 1;
  }
  if (p.goal.g === "deduction") {
    const c = solutionCount(p);
    if (c < 1 || c > 3) {
      console.error(`FAIL ${p.id}: deduction solutionCount ${String(c)} not in [1,3]`);
      bad += 1;
    }
  }
  if (p.goal.g === "exact" && !difficultyReport(p).exactReachable) {
    console.error(`FAIL ${p.id}: exact value not reachable`);
    bad += 1;
  }
}
console.log(bad === 0 ? "\nALL OK" : `\n${String(bad)} problems`);
