import { describe, expect, it } from "vitest";
import { computeCensus, resonanceAtLeast } from "@/game/battle/resonance";
import { decidePlacements, decideReroll } from "@/game/battle/policy";
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
import { createStreams, deriveSeed } from "@/services/rng";
import type { BattleSnapshot, SlotId } from "@/types/battle";

// The "intended" red-resonance build a competent player assembles mid-run: 7 red dice
// (red-6 → first Weapons slot resolves twice + red-4 Burn + red-2 +1 + red affinity),
// blue support, on Mk2 weapons. This is a guardrail — it proves the row-8 gate is
// beatable by the designed build, so a low greedy-bot floor is a bot/economy problem,
// not an unwinnable gate.
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
): void => {
  const die = snap.dice.find((d) => d.uid === uid);
  const slot = snap.slots[slotId];
  if (die === undefined || slot === undefined) return;
  die.state = "placed";
  die.slot = slotId;
  slot.dieUid = uid;
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

  for (let round = 0; round < 30; round += 1) {
    const rerolls = decideReroll(snap);
    if (rerolls.length > 0) {
      snap.dice = snap.dice.map((d) =>
        rerolls.includes(d.uid) && d.state === "tray"
          ? { ...d, value: streams.dice.int(1, d.tier) }
          : d,
      );
    }
    const decision = decidePlacements(snap);
    if (decision.targetId !== null) snap.targetId = decision.targetId;
    for (const p of decision.placements) {
      if (canPlaceDie(snap, p.uid, p.slot)) applyPlacement(snap, p.uid, p.slot);
    }
    if (decision.reserveUid !== undefined) {
      const die = snap.dice.find((d) => d.uid === decision.reserveUid);
      if (die?.state === "tray") die.state = "reserved";
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
    // Logged so the number lands in the balance notes.
    console.log(
      `gate guardrail: intended red-6 deck vs raiderAlpha tide 2 — ${(winrate * 100).toFixed(1)}% over ${String(runs)} runs`,
    );
    expect(winrate).toBeGreaterThanOrEqual(0.55);
  }, 30000);
});
