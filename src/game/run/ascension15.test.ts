import { describe, expect, it } from "vitest";
import {
  A15_BOSS_PART,
  ascensionMods,
  ascensionRewardsUpTo,
  ascensionScrapBonusPct,
  MAX_ASCENSION,
  maxSelectableAscension,
} from "@/data/ascension";
import { harnessEnemy } from "@/game/battle/battleHarness";
import { hiddenIntentIds, presumedIntent } from "@/game/battle/intentVisibility";
import { enemyForecast, mitigationOf } from "@/game/battle/view/forecast";
import { buildBattleSnapshot } from "@/game/battle/setup";
import { spawnEnemy } from "@/game/battle/spawn";
import { seatCount, tableSeats, tableSizeFor } from "@/game/battle/table";
import { mkTopFor, nextMkFor, TABLE_SIZE } from "@/game/economy/prices";
import {
  bypassPctFor,
  disintegrationPctFor,
  holeTollFor,
  ridesStayGentle,
} from "@/game/run/motifs";
import { ascensionScoreMult, runScore } from "@/game/run/modes";
import { plausibility } from "@/game/run/plausibility";
import { shopPricePct } from "@/game/run/shopPrice";
import { tideCapFor } from "@/game/run/tide";
import { ascensionMult, ascensionShardMult } from "@/game/xp";
import { createInitialRunStats } from "@/stores/runStore";
import { createStream, createStreams } from "@/services/rng";

const NINE = [
  "red-d6",
  "red-d6",
  "ember",
  "cinder",
  "slug",
  "magma",
  "flare",
  "blue-d6",
  "blue-d6",
];

const dealt = (ascension: number) =>
  buildBattleSnapshot(
    "wanderer",
    NINE,
    ["raider"],
    createStreams(11),
    createStream(12),
    {},
    { ascension },
  );

describe("ascension reaches A15", () => {
  it("opens fifteen levels, one per clear", () => {
    expect(MAX_ASCENSION).toBe(15);
    expect(maxSelectableAscension(99)).toBe(15);
    expect(maxSelectableAscension(11)).toBe(11);
  });
});

describe("A11 Hunger", () => {
  it("deals six dice to the table where A10 deals seven", () => {
    const table = (ascension: number) =>
      dealt(ascension).dice.filter((die) => die.state === "tray").length;
    expect(table(10)).toBe(TABLE_SIZE);
    expect(table(11)).toBe(TABLE_SIZE - 1);
  });

  it("lays the board out for six seats", () => {
    expect(tableSizeFor(11)).toBe(6);
    const dice = dealt(11).dice;
    expect(seatCount(dice, tableSizeFor(11))).toBe(6);
    expect(Math.max(...tableSeats(dice, tableSizeFor(11)).values())).toBe(5);
  });
});

describe("A12 Heavy Vacuum", () => {
  it("raises the bypass by ten points of hull and the unmaking chance by three", () => {
    expect(bypassPctFor(2, 11)).toBeCloseTo(0.2);
    expect(bypassPctFor(2, 12)).toBeCloseTo(0.3);
    expect(holeTollFor(2, 30, 11)).toBe(6);
    expect(holeTollFor(2, 30, 12)).toBe(9);
    expect(disintegrationPctFor(2, 11)).toBe(5);
    expect(disintegrationPctFor(2, 12)).toBe(8);
  });

  it("adds nothing to a sector without black holes", () => {
    expect(bypassPctFor(1, 12)).toBe(0);
    expect(disintegrationPctFor(1, 12)).toBe(0);
  });
});

describe("A13 Blind Sensors", () => {
  const board = (ascension: number) => ({
    ascension,
    enemies: [
      harnessEnemy({ id: "e0" }),
      harnessEnemy({ id: "e1" }),
      harnessEnemy({ id: "e2", hp: 0 }),
    ],
  });

  it("hides the intent of the rearmost living enemy only", () => {
    expect([...hiddenIntentIds(board(12))]).toEqual([]);
    expect([...hiddenIntentIds(board(13))]).toEqual(["e1"]);
  });

  const bossAt = (enemyId: string, ascension: number) => {
    const snapshot = buildBattleSnapshot(
      "wanderer",
      NINE,
      [enemyId],
      createStreams(11),
      createStream(12),
      {},
      { ascension },
    );
    const enemy = snapshot.enemies[0];
    if (enemy === undefined) throw new Error("no enemy");
    return { snapshot, enemy };
  };

  it("presumes the intent that hits hardest once its aura is counted", () => {
    const { snapshot, enemy } = bossAt("breakerBarge", 15);
    expect(enemy.phase).toBe(1);
    expect(presumedIntent(snapshot, enemy)).toEqual({ t: "multi", n: 3, k: 2 });
    const bare = bossAt("breakerBarge", 5);
    expect(presumedIntent(bare.snapshot, bare.enemy)).toEqual({ t: "attack", n: 7 });
  });

  const idleFoe = (ascension: number) => {
    const snapshot = dealt(ascension);
    const enemies = snapshot.enemies.map((enemy) => ({
      ...enemy,
      nextIntent: { t: "idle" as const },
    }));
    return { ...snapshot, enemies };
  };

  it("forecasts a hidden intent as the heaviest attack, as the bot prices it", () => {
    expect(enemyForecast(idleFoe(12)).raw).toBe(0);
    expect(enemyForecast(idleFoe(13)).raw).toBeGreaterThan(0);
    const hidden = idleFoe(13);
    const foe = hidden.enemies[0];
    if (foe === undefined) throw new Error("no enemy");
    expect(mitigationOf(hidden, foe).raw).toBeGreaterThan(0);
    const shown = idleFoe(12);
    const seen = shown.enemies[0];
    if (seen === undefined) throw new Error("no enemy");
    expect(mitigationOf(shown, seen).raw).toBe(0);
  });

  it("stops Sensors at Mk2 and leaves every other slot at Mk3", () => {
    expect(mkTopFor("sensors", 12)).toBe(3);
    expect(mkTopFor("sensors", 13)).toBe(2);
    expect(mkTopFor("weaponA", 13)).toBe(3);
    expect(nextMkFor("sensors", 2, 13)).toBeNull();
    expect(nextMkFor("sensors", 2, 12)).toBe(3);
  });
});

describe("A14 Debt", () => {
  it("stacks a 40 percent markup on A3 and A7 and six more elite shield on A2", () => {
    const mods = ascensionMods(14);
    expect(mods.shopPricePct).toBe(85);
    expect(mods.eliteShield).toBe(12);
    expect(
      shopPricePct({
        perks: [],
        chartPicks: [],
        modules: [],
        flags: {},
        ascension: 14,
        contractId: null,
      }),
    ).toBe(-85);
  });
});

describe("A15 Singularity", () => {
  it("gives every boss one more part", () => {
    const at = (ascension: number) =>
      spawnEnemy("quarantineWarden", "b", createStream(5), { ascension }).subsystems.map(
        (sub) => sub.key,
      );
    expect(at(14)).not.toContain(A15_BOSS_PART.id);
    expect(at(15)).toContain(A15_BOSS_PART.id);
    expect(at(15)).toHaveLength(at(14).length + 1);
  });

  it("raises the tide cap a third time, after A4 and A9", () => {
    expect(tideCapFor(3, "campaign", 2)).toBe(3);
    expect(tideCapFor(14, "campaign", 2)).toBe(5);
    expect(tideCapFor(15, "campaign", 2)).toBe(6);
    expect(tideCapFor(15, "campaign", 6)).toBe(8);
  });

  it("withdraws the stable ride", () => {
    expect(ridesStayGentle(14)).toBe(true);
    expect(ridesStayGentle(15)).toBe(false);
  });
});

describe("ascension rewards scale", () => {
  it("multiplies XP by 1 + 0.12A and shards by 1 + 0.10A", () => {
    expect(ascensionMult(10)).toBeCloseTo(2.2);
    expect(ascensionShardMult(10)).toBeCloseTo(2);
    expect(ascensionShardMult(15)).toBeCloseTo(2.5);
  });

  it("pays 5 percent more fight scrap for every level above A10", () => {
    expect(ascensionScrapBonusPct(10)).toBe(0);
    expect(ascensionScrapBonusPct(11)).toBe(5);
    expect(ascensionScrapBonusPct(15)).toBe(25);
  });

  it("lists the A11 to A15 rewards", () => {
    const fresh = ascensionRewardsUpTo(15).filter((reward) => reward.level > 10);
    expect(fresh.map((reward) => reward.kind)).toEqual([
      "scrap",
      "cosmetic",
      "contract",
      "cosmetic",
      "cosmetic",
      "badge",
    ]);
  });

  it("multiplies a drift score by 1 + 0.05A and widens the plausibility bound with it", () => {
    const stats = { ...createInitialRunStats(), depth: 10, kills: 20, scrapEarned: 300 };
    const base = runScore(stats);
    expect(runScore(stats, 10)).toBe(Math.round(base * 1.5));
    expect(ascensionScoreMult(15)).toBeCloseTo(1.75);
    const claim = { depth: 10, kills: 20, scrap: 300 };
    expect(plausibility({ ...claim, score: 2200 }).reasons).toContain("scorePerDepth");
    expect(plausibility({ ...claim, score: 2200, ascension: 10 }).ok).toBe(true);
  });
});
