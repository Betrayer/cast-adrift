import { describe, expect, it } from "vitest";
import { computeCensus, resonanceAtLeast } from "@/game/battle/resonance";
import {
  applyEchoActive,
  applyOfficerActive,
  decidePlacements,
  decideReroll,
  echoLookUids,
  readyEcho,
} from "@/game/battle/policy";
import {
  advanceTurn,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import {
  buildBattleSnapshot,
  canPlaceDie,
  createEnemyStream,
  type MkLevels,
} from "@/game/battle/setup";
import { echoToken } from "@/data/echo";
import { createStreams, deriveSeed } from "@/services/rng";
import type { FireModeId } from "@/data/fireModes";
import type { BattleSnapshot, SlotId } from "@/types/battle";

const INTENDED_DECK: readonly string[] = [
  "slug",
  "slug",
  "ember",
  "ember",
  "ember",
  "ember",
  "coreshard",
  "frostplate",
  "frostplate",
];

const MK2_WEAPONS: MkLevels = { weaponA: 2, weaponB: 2 };

const applyPlacement = (
  snap: BattleSnapshot,
  uid: string,
  slotId: SlotId,
  mode?: FireModeId,
): void => {
  const die = snap.dice.find((d) => d.uid === uid);
  const slot = snap.slots[slotId];
  if (die === undefined || slot === undefined) return;
  die.state = "placed";
  die.slot = slotId;
  slot.dieUid = uid;
  if (mode !== undefined) slot.mode = mode;
};

const simulateGate = (rootSeed: number): boolean => {
  const streams = createStreams(rootSeed);
  const enemyStream = createEnemyStream(streams);
  let snap = buildBattleSnapshot(
    "wanderer",
    INTENDED_DECK,
    ["raiderAlpha"],
    streams,
    enemyStream,
    MK2_WEAPONS,
    { tide: 2, hull: 30, hullMax: 30, chargeCap: 10 },
  );

  const spent: string[] = [];
  for (let round = 0; round < 30; round += 1) {
    const rerolls = decideReroll(snap);
    if (rerolls.length > 0) {
      snap.dice = snap.dice.map((d) =>
        rerolls.includes(d.uid) && d.state === "tray"
          ? { ...d, value: streams.dice.int(1, d.tier) }
          : d,
      );
    }
    const ready = readyEcho(snap, spent);
    const look = echoLookUids(snap, spent);
    if (ready !== undefined && look.length > 0) {
      snap.dice = snap.dice.map((d) =>
        look.includes(d.uid) && d.state === "tray"
          ? { ...d, value: Math.max(d.value, streams.dice.int(1, d.tier)) }
          : d,
      );
      spent.push(echoToken(ready));
    }
    const decision = decidePlacements(snap, spent);
    if (decision.targetId !== null) snap.targetId = decision.targetId;
    for (const p of decision.placements) {
      if (canPlaceDie(snap, p.uid, p.slot)) {
        applyPlacement(snap, p.uid, p.slot, p.mode);
      }
    }
    if (decision.reserveUid !== undefined) {
      const die = snap.dice.find((d) => d.uid === decision.reserveUid);
      if (die?.state === "tray") die.state = "reserved";
    }
    if (decision.active !== undefined) {
      snap = applyOfficerActive(snap, decision.active);
      spent.push(decision.active);
    }
    if (decision.echo !== undefined) {
      snap = applyEchoActive(snap, decision.echo);
      spent.push(echoToken(decision.echo));
    }
    snap = resolvePlayerPhase(snap).next;
    if (snap.outcome !== undefined) break;
    snap = resolveEnemyPhase(snap, enemyStream).next;
    if (snap.outcome !== undefined) break;
    snap = advanceTurn(snap, streams);
  }
  return snap.outcome === "victory";
};

describe("gate guardrail", () => {
  it("the intended red-6 deck actually reaches the red set", () => {
    const census = computeCensus(
      INTENDED_DECK.map((defId) => ({
        school:
          defId === "frostplate"
            ? ("blue" as const)
            : defId === "coreshard"
              ? ("prismatic" as const)
              : ("red" as const),
      })),
    );
    expect(resonanceAtLeast(census, "red", 6)).toBe(true);
  });

  it("clears the row-8 mini-boss gate (raiderAlpha, tide 2) at a healthy rate", () => {
    const runs = 500;
    let wins = 0;
    for (let i = 0; i < runs; i += 1) {
      if (simulateGate(deriveSeed(20240706, `gate-${String(i)}`))) wins += 1;
    }
    const winrate = wins / runs;
    expect(winrate).toBeGreaterThanOrEqual(0.55);
  }, 30000);
});
