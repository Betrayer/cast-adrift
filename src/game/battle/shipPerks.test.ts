import { describe, expect, it } from "vitest";
import {
  harnessDie,
  harnessEnemy,
  harnessSnap,
} from "@/game/battle/battleHarness";
import { incomingHits, resolveEnemyPhase } from "@/game/battle/resolver";
import { enemyForecast } from "@/game/battle/view/forecast";
import { sourcesForSlot } from "@/game/battle/slotRelevance";
import { createStream } from "@/services/rng";
import type { BattleSnapshot } from "@/types/battle";

const ELITE = "raiderAlpha";
const MINIBOSS = "convoyAlpha";

const dice = [harnessDie("a", "red-d6")];

const snapWith = (
  defId: string,
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot =>
  harnessSnap(dice, {
    enemies: [harnessEnemy({ defId, nextIntent: { t: "attack", n: 10 } })],
    ...over,
  });

const firstEnemy = (snap: BattleSnapshot) => {
  const enemy = snap.enemies[0];
  if (enemy === undefined) throw new Error("no enemy");
  return enemy;
};

describe("the first-hit cut", () => {
  it("takes the perk's percent off the first hit of an elite", () => {
    const snap = snapWith(ELITE, { perks: ["shipPlates"] });
    expect(incomingHits(snap, firstEnemy(snap), 10, 2)).toEqual([7, 10]);
  });

  it("leaves an ordinary enemy's hit whole", () => {
    const snap = snapWith("raider", { perks: ["shipPlates"] });
    expect(incomingHits(snap, firstEnemy(snap), 10, 1)).toEqual([10]);
  });

  it("does nothing once a hit has landed", () => {
    const snap = snapWith(ELITE, { perks: ["shipPlates"], firstHitSpent: true });
    expect(incomingHits(snap, firstEnemy(snap), 10, 1)).toEqual([10]);
  });

  it("adds mastery and the plates together", () => {
    const snap = snapWith(ELITE, { perks: ["shipPlates", "mastery-wanderer-4"] });
    expect(incomingHits(snap, firstEnemy(snap), 20, 1)).toEqual([9]);
  });

  it("is spent by an elite's hit and not by an ordinary enemy's", () => {
    const elite = snapWith(ELITE, { perks: ["shipPlates"] });
    expect(resolveEnemyPhase(elite, createStream(1)).next.firstHitSpent).toBe(true);
    const plain = snapWith("raider", { perks: ["shipPlates"] });
    expect(resolveEnemyPhase(plain, createStream(1)).next.firstHitSpent).not.toBe(true);
  });
});

describe("the black box", () => {
  const lethal = (defId: string, over: Partial<BattleSnapshot> = {}): BattleSnapshot =>
    resolveEnemyPhase(
      snapWith(defId, { hull: 3, perks: ["shipBlackBox"], ...over }),
      createStream(1),
    ).next;

  it("leaves one hull on a lethal hit in a mini-boss fight and marks itself spent", () => {
    const next = lethal(MINIBOSS);
    expect(next.hull).toBe(1);
    expect(next.blackBoxSpent).toBe(true);
    expect(next.outcome).toBeUndefined();
  });

  it("does not fire in an ordinary fight", () => {
    const next = lethal("raider");
    expect(next.hull).toBe(0);
    expect(next.outcome).toBe("defeat");
    expect(next.blackBoxSpent).not.toBe(true);
  });

  it("does not fire in an elite fight", () => {
    expect(lethal(ELITE).outcome).toBe("defeat");
  });

  it("does not fire twice", () => {
    expect(lethal(MINIBOSS, { blackBoxSpent: true }).outcome).toBe("defeat");
  });

  it("stays unspent when the escape pod saves the ship first", () => {
    const next = lethal(MINIBOSS, {
      perks: ["shipBlackBox"],
      modules: ["escapePod"],
    });
    expect(next.hull).toBe(1);
    expect(next.survivedLethal).toBe(true);
    expect(next.blackBoxSpent).not.toBe(true);
  });
});

describe("the first-hit cut against a hit that does not land", () => {
  it("waits for the first hit that lands when the opener is jammed to nothing", () => {
    const snap = snapWith(ELITE, {
      perks: ["shipPlates", "mastery-wanderer-4"],
      enemies: [
        harnessEnemy({
          defId: ELITE,
          nextIntent: { t: "multi", n: 2, k: 2 },
          statuses: { jam: 1 },
        }),
      ],
    });
    const next = resolveEnemyPhase(snap, createStream(1)).next;
    expect(next.hull).toBe(29);
    expect(next.firstHitSpent).toBe(true);
  });
});

describe("the turn forecast with two authored attackers", () => {
  it("cuts the first hit once, not once per attacker", () => {
    const pair = harnessSnap(dice, {
      perks: ["shipPlates"],
      enemies: [
        harnessEnemy({ id: "enemy-0", defId: ELITE, nextIntent: { t: "attack", n: 10 } }),
        harnessEnemy({ id: "enemy-1", defId: ELITE, nextIntent: { t: "attack", n: 10 } }),
      ],
    });
    expect(enemyForecast(pair).raw).toBe(17);
  });
});

describe("the forecast against resolution", () => {
  it("puts the cut on the same hit the battle does when the opener is jammed away", () => {
    const snap = snapWith(ELITE, {
      perks: ["shipPlates", "mastery-wanderer-4"],
      enemies: [
        harnessEnemy({
          defId: ELITE,
          nextIntent: { t: "multi", n: 2, k: 2 },
          statuses: { jam: 1 },
        }),
      ],
    });
    const after = resolveEnemyPhase(snap, createStream(1)).next;
    expect(enemyForecast(snap).toHull).toBe(snap.hull - after.hull);
  });
});

describe("where the slot sheet says a cap comes from", () => {
  it("names the hardpoint as the source of a bigger weapon cap", () => {
    const sources = sourcesForSlot("weaponA", {
      perks: ["shipHardpoint"],
      modules: [],
      chartPicks: [],
      officers: [],
      cargo: [],
      mutators: [],
      deckDefIds: [],
    });
    expect(sources.find((source) => source.id === "shipHardpoint")?.reasons).toContainEqual({
      kind: "tierDelta",
      n: 1,
    });
  });
});
