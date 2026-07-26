import { CHART_NODES } from "../src/data/chart";
import {
  decidePlacements,
  decideReroll,
} from "../src/game/battle/policy";
import {
  advanceTurn,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "../src/game/battle/resolver";
import {
  buildBattleSnapshot,
  canPlaceDie,
  createEnemyStream,
} from "../src/game/battle/setup";
import { computeRunMods } from "../src/game/run/runMods";
import { createStreams } from "../src/services/rng";
import type { BattleSnapshot, SlotId } from "../src/types/battle";

const TURN_CAP = 30;
const RUNS = 300;
const TIDE = 0;
const DECK = [
  "red-d6",
  "red-d6",
  "blue-d6",
  "green-d4",
  "black-d6",
  "yellow-d6",
];
const ENEMIES = ["raider"];

const applyPlacement = (
  snapshot: BattleSnapshot,
  uid: string,
  slotId: SlotId,
): void => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  const slot = snapshot.slots[slotId];
  if (die === undefined || slot === undefined) return;
  die.state = "placed";
  die.slot = slotId;
  slot.dieUid = uid;
};

const simulate = (seed: number, picks: readonly string[]) => {
  const streams = createStreams(seed);
  const enemyStream = createEnemyStream(streams);
  const hullMax = 30 + computeRunMods([], picks).hullMaxDelta;
  const chargeCap = 10 + computeRunMods([], picks).chargeCapDelta;
  let snapshot = buildBattleSnapshot(
    "wanderer",
    DECK,
    ENEMIES,
    streams,
    enemyStream,
    {},
    { chartPicks: picks, hull: hullMax, hullMax, chargeCap, tide: TIDE },
  );
  for (let round = 0; round < TURN_CAP; round += 1) {
    const rerollUids = decideReroll(snapshot);
    if (rerollUids.length > 0) {
      snapshot.dice = snapshot.dice.map((d) =>
        rerollUids.includes(d.uid) && d.state === "tray"
          ? { ...d, value: streams.dice.int(1, d.tier) }
          : d,
      );
    }
    const decision = decidePlacements(snapshot);
    if (decision.targetId !== null) snapshot.targetId = decision.targetId;
    for (const p of decision.placements) {
      if (canPlaceDie(snapshot, p.uid, p.slot)) {
        applyPlacement(snapshot, p.uid, p.slot);
      }
    }
    const player = resolvePlayerPhase(snapshot);
    snapshot = player.next;
    if (snapshot.outcome !== undefined) break;
    const enemy = resolveEnemyPhase(snapshot, enemyStream);
    snapshot = enemy.next;
    if (snapshot.outcome !== undefined) break;
    snapshot = advanceTurn(snapshot, streams);
  }
  return {
    win: snapshot.outcome === "victory",
    turns: Math.min(snapshot.turn, TURN_CAP),
    hull: snapshot.hull,
  };
};

const run = (picks: readonly string[]) => {
  let wins = 0;
  let turns = 0;
  let hull = 0;
  for (let seed = 1; seed <= RUNS; seed += 1) {
    const r = simulate(seed, picks);
    if (r.win) wins += 1;
    turns += r.turns;
    hull += r.hull;
  }
  return {
    winrate: (wins / RUNS) * 100,
    avgTurns: turns / RUNS,
    avgHull: hull / RUNS,
  };
};

const keystones = CHART_NODES.filter((n) => n.kind === "keystone");
const base = run([]);
console.log(`| config | winrate | avg turns | avg hull |`);
console.log(`|---|---|---|---|`);
console.log(
  `| baseline | ${base.winrate.toFixed(1)}% | ${base.avgTurns.toFixed(1)} | ${base.avgHull.toFixed(1)} |`,
);
for (const k of keystones) {
  const r = run([k.id]);
  console.log(
    `| ${k.name ?? k.id} | ${r.winrate.toFixed(1)}% | ${r.avgTurns.toFixed(1)} | ${r.avgHull.toFixed(1)} |`,
  );
}
