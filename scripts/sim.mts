import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STARTER_DECK } from "../src/data/decks";
import {
  ENEMY_BY_ID,
  expandEncounterIds,
  isEncounterGroup,
} from "../src/data/enemies/sector1";
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
  MAX_ENEMIES,
} from "../src/game/battle/setup";
import { createStreams, deriveSeed } from "../src/services/rng";
import type { BattleSnapshot, SlotId } from "../src/types/battle";

const TURN_CAP = 30;

interface RunResult {
  win: boolean;
  timeout: boolean;
  turns: number;
  hullLeft: number;
  dealt: number;
  taken: number;
}

const getArg = (name: string, fallback: string): string => {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return value ?? fallback;
};

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

const runBattle = (
  enemyIds: readonly string[],
  deck: readonly string[],
  rootSeed: number,
): RunResult => {
  const streams = createStreams(rootSeed);
  const enemyStream = createEnemyStream(streams);
  let snapshot = buildBattleSnapshot(
    "wanderer",
    deck,
    enemyIds,
    streams,
    enemyStream,
  );
  let dealt = 0;
  let taken = 0;

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
    for (const placement of decision.placements) {
      if (canPlaceDie(snapshot, placement.uid, placement.slot)) {
        applyPlacement(snapshot, placement.uid, placement.slot);
      }
    }
    if (decision.reserveUid !== undefined) {
      const die = snapshot.dice.find((d) => d.uid === decision.reserveUid);
      if (die?.state === "tray") die.state = "reserved";
    }

    const player = resolvePlayerPhase(snapshot);
    dealt += player.beats
      .filter((b) => b.kind === "damage")
      .reduce((sum, b) => sum + b.amount, 0);
    snapshot = player.next;
    if (snapshot.outcome !== undefined) break;

    const enemy = resolveEnemyPhase(snapshot, enemyStream);
    taken += enemy.beats.reduce(
      (sum, b) => sum + b.hullDamage + b.shieldDamage,
      0,
    );
    snapshot = enemy.next;
    if (snapshot.outcome !== undefined) break;

    snapshot = advanceTurn(snapshot, streams);
  }

  const timeout = snapshot.outcome === undefined;
  return {
    win: snapshot.outcome === "victory",
    timeout,
    turns: Math.min(snapshot.turn, TURN_CAP),
    hullLeft: snapshot.hull,
    dealt,
    taken,
  };
};

const decile = (sorted: readonly number[], q: number): number => {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(q * sorted.length) - 1),
  );
  return sorted[index] ?? 0;
};

const DECILES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

const main = (): void => {
  const startedAt = Date.now();
  const enemyArg = getArg("enemy", "raider");
  const runs = Number(getArg("runs", "1000"));
  const seed = Number(getArg("seed", "7"));
  const deckName = getArg("deck", "starter");
  if (!Number.isFinite(runs) || runs <= 0) {
    console.error(`sim: invalid --runs "${getArg("runs", "1000")}"`);
    process.exit(1);
  }
  if (deckName !== "starter") {
    console.error(`sim: unknown deck "${deckName}" (only "starter" exists)`);
    process.exit(1);
  }
  const deck = STARTER_DECK;

  const encounters = enemyArg
    .split(";")
    .map((entry) => entry.split(",").map((id) => id.trim()).filter(Boolean))
    .filter((ids) => ids.length > 0);
  for (const ids of encounters) {
    for (const id of ids) {
      if (!ENEMY_BY_ID.has(id) && !isEncounterGroup(id)) {
        console.error(`sim: unknown enemy or group "${id}"`);
        process.exit(1);
      }
    }
    const expanded = expandEncounterIds(ids);
    if (expanded.length > MAX_ENEMIES) {
      console.warn(
        `sim: encounter "${ids.join(",")}" expands to ${String(expanded.length)} enemies; only the first ${String(MAX_ENEMIES)} fight (rest ignored)`,
      );
    }
  }

  const header = [
    "enemies",
    "runs",
    "seed",
    "deck",
    "winrate",
    "timeouts",
    "avgTurns",
    "avgHullLeftWins",
    ...DECILES.map((q) => `dealtP${String(Math.round(q * 100))}`),
    ...DECILES.map((q) => `takenP${String(Math.round(q * 100))}`),
  ].join(",");
  const rows: string[] = [header];

  for (const enemyIds of encounters) {
    const key = enemyIds.join("+");
    const results: RunResult[] = [];
    for (let i = 0; i < runs; i += 1) {
      results.push(
        runBattle(enemyIds, deck, deriveSeed(seed, `${key}:run-${String(i)}`)),
      );
    }
    const wins = results.filter((r) => r.win);
    const winrate = wins.length / results.length;
    const timeouts = results.filter((r) => r.timeout).length;
    const avgTurns =
      results.reduce((sum, r) => sum + r.turns, 0) / results.length;
    const avgHullLeftWins =
      wins.length > 0
        ? wins.reduce((sum, r) => sum + r.hullLeft, 0) / wins.length
        : 0;
    const dealtSorted = results.map((r) => r.dealt).sort((a, b) => a - b);
    const takenSorted = results.map((r) => r.taken).sort((a, b) => a - b);
    rows.push(
      [
        key,
        String(results.length),
        String(seed),
        deckName,
        winrate.toFixed(3),
        String(timeouts),
        avgTurns.toFixed(2),
        avgHullLeftWins.toFixed(2),
        ...DECILES.map((q) => String(decile(dealtSorted, q))),
        ...DECILES.map((q) => String(decile(takenSorted, q))),
      ].join(","),
    );
    console.log(
      `sim: ${key} — winrate ${(winrate * 100).toFixed(1)}% · avgTurns ${avgTurns.toFixed(1)} · avgHullLeft(wins) ${avgHullLeftWins.toFixed(1)} · timeouts ${String(timeouts)}`,
    );
  }

  const outDir = join(process.cwd(), "sim-out");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, "-");
  const outPath = join(outDir, `${stamp}.csv`);
  writeFileSync(outPath, `${rows.join("\n")}\n`, "utf8");
  console.log(
    `sim: wrote ${outPath} in ${String(Date.now() - startedAt)} ms (${String(runs)} runs × ${String(encounters.length)} config(s), seed ${String(seed)})`,
  );
};

main();
