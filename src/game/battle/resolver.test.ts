import { describe, expect, it } from "vitest";
import { CHART_NODES } from "@/data/chart";
import { ENEMY_BY_ID } from "@/data/enemies";
import { ALL_MODULES } from "@/data/modules";
import { ALL_PERKS } from "@/data/perks";
import { PLAYABLE_SHIPS } from "@/data/ships";
import {
  advanceTurn,
  CHARGE_CAP,
  DODGE_PCT_CAP,
  evasionFor,
  evasionTuningFor,
  GLANCING_PCT_CAP,
  resolveEnemyPhase,
  resolvePlayerPhase,
  vulnerableFor,
} from "@/game/battle/resolver";
import {
  buildEnemies,
  canPlaceDie,
  drawIntent,
  spawnEnemy,
} from "@/game/battle/setup";
import { computeCensus } from "@/game/battle/resonance";
import {
  createStream,
  createStreamFromState,
  createStreams,
  restoreStreams,
  serializeStreams,
} from "@/services/rng";
import type {
  BattleSnapshot,
  EnemyState,
  RolledDie,
  SlotId,
} from "@/types/battle";
import { intentsOfStep } from "@/types/content";
import type { DieTier, Intent } from "@/types/content";

const enemyStream = () => createStream(1234);

const enemy = (defId: string, over: Partial<EnemyState> = {}): EnemyState => ({
  ...spawnEnemy(defId, over.id ?? "enemy-0", enemyStream()),
  ...over,
});

const mkEnemy = (over: Partial<EnemyState> = {}): EnemyState => ({
  id: "enemy-0",
  defId: "raider",
  hp: 18,
  hpMax: 18,
  shield: 0,
  intentIndex: 0,
  nextIntent: { t: "attack", n: 5 },
  statuses: {},
  subsystems: [],
  phase: 0,
  ...over,
});

const die = (
  uid: string,
  value: number,
  slot?: SlotId,
  tier: DieTier = 6,
): RolledDie => ({
  uid,
  defId: "grey-d4",
  tier,
  school: "grey",
  value,
  state: slot === undefined ? "tray" : "placed",
  slot,
});

const snap = (over: Partial<BattleSnapshot> = {}): BattleSnapshot => ({
  turn: 1,
  hull: 30,
  hullMax: 30,
  shield: 0,
  shieldPersist: 0,
  charge: 0,
  scrap: 0,
  runScrap: 0,
  tide: 0,
  interference: 0,
  perks: [],
  dice: [],
  slots: {
    weaponA: { cap: 8, mk: 1 },
    weaponB: { cap: 8, mk: 1 },
    shields: { cap: 8, mk: 1 },
    engines: { cap: 6, mk: 1 },
    sensors: { cap: 6, mk: 1 },
    reactor: { cap: 10, mk: 1 },
  },
  enemies: [enemy("raider")],
  targetId: "enemy-0",
  evasion: null,
  nextTurnMods: {},
  nextRollBonus: 0,
  chargeCap: 10,
  sacrificePool: 0,
  bloodReactorUsed: false,
  burnDoubleUsed: false,
  blockedSlots: [],
  shrunkSlots: [],
  lockedDice: [],
  resonance: computeCensus([]),
  survivedLethal: false,
  lastPlayerDamage: 0,
  stolenScrap: 0,
  pendingTwist: 0,
  pendingSwap: 0,
  pendingStorm: 0,
  ascension: 0,
  exceedCap: [],
  sectorHpPct: 0,
  sectorDmgPct: 0,
  enemyHpPct: 0,
  ...over,
});

type PlacementSlots = Partial<
  Record<
    "weaponA" | "weaponB" | "spinal" | "shields" | "engines" | "sensors" | "reactor",
    number
  >
>;

const withPlacements = (
  placements: PlacementSlots,
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot => {
  const base = snap(over);
  for (const [slotId, value] of Object.entries(placements) as [
    keyof PlacementSlots,
    number,
  ][]) {
    const uid = `die-${slotId}`;
    base.dice.push(die(uid, value, slotId, 20));
    const slot = base.slots[slotId];
    if (slot !== undefined) slot.dieUid = uid;
  }
  return base;
};

const forceIntent = (state: EnemyState, intent: Intent): EnemyState => ({
  ...state,
  nextIntent: intent,
});

describe("evasion band math", () => {
  it.each([
    [1, 2, 4],
    [3, 5, 11],
    [5, 8, 18],
    [8, 10, 25],
  ])("V %i → dodge %i%% · glancing %i%%", (value, dodge, glancing) => {
    const evasion = evasionFor(value);
    expect(evasion.dodgePct).toBe(dodge);
    expect(evasion.glancingPct).toBe(glancing);
  });

  it("glancing outruns dodge at every value", () => {
    for (let value = 1; value <= 20; value += 1) {
      const evasion = evasionFor(value);
      expect(evasion.glancingPct).toBeGreaterThan(evasion.dodgePct);
    }
  });

  it("caps dodge at 10% and glancing at 25%", () => {
    expect(evasionFor(20)).toEqual({
      dodgePct: 10,
      glancingPct: 25,
      intercept: true,
    });
  });

  it("keeps expected mitigation at the caps a tool, not a wall", () => {
    const capped = evasionFor(20);
    const mitigation = capped.dodgePct + capped.glancingPct / 2;
    expect(mitigation).toBeCloseTo(22.5, 5);
  });

  it("adds the evasion delta and halves it for glancing", () => {
    expect(evasionFor(3, 2)).toEqual({
      dodgePct: 7,
      glancingPct: 12,
      intercept: false,
    });
    expect(evasionFor(3, 1)).toEqual({
      dodgePct: 6,
      glancingPct: 11,
      intercept: false,
    });
  });

  it("never drops below zero and flags intercept only from V 8", () => {
    expect(evasionFor(1, -30)).toEqual({
      dodgePct: 0,
      glancingPct: 0,
      intercept: false,
    });
    expect(evasionFor(7).intercept).toBe(false);
    expect(evasionFor(8).intercept).toBe(true);
  });

  it("rolls the authored rates over a pinned 200-hit sequence", () => {
    const evasion = evasionFor(20);
    const stream = createStream(4242);
    let dodged = 0;
    let glanced = 0;
    for (let i = 0; i < 200; i += 1) {
      const roll = stream.int(1, 100);
      if (roll <= evasion.dodgePct) dodged += 1;
      else if (roll <= evasion.dodgePct + evasion.glancingPct) glanced += 1;
    }
    expect(Math.abs((dodged / 200) * 100 - evasion.dodgePct)).toBeLessThanOrEqual(2);
    expect(
      Math.abs((glanced / 200) * 100 - evasion.glancingPct),
    ).toBeLessThanOrEqual(2);
    expect(glanced).toBeGreaterThan(dodged);
  });
});

describe("evasion carriers", () => {
  const CARRIERS: readonly { id: string; delta: number }[] = [
    ...ALL_PERKS.filter((p) => (p.mods?.evasionDelta ?? 0) !== 0).map((p) => ({
      id: `perk:${p.id}`,
      delta: p.mods?.evasionDelta ?? 0,
    })),
    ...ALL_MODULES.filter((m) => (m.mods?.evasionDelta ?? 0) !== 0).map((m) => ({
      id: `module:${m.id}`,
      delta: m.mods?.evasionDelta ?? 0,
    })),
    ...CHART_NODES.filter((n) => (n.mods?.evasionDelta ?? 0) !== 0).map((n) => ({
      id: `chart:${n.id}`,
      delta: n.mods?.evasionDelta ?? 0,
    })),
  ];

  it("has exactly the carriers the U2 sweep re-tuned", () => {
    expect(CARRIERS.map((c) => `${c.id}=${String(c.delta)}`)).toEqual([
      "perk:mirrorLattice=2",
      "perk:rhizome=4",
      "perk:standingWave=2",
      "perk:afterburner=2",
      "module:ballastModule=-2",
      "module:hardpointClamp=2",
      "module:bulkheadRing=-2",
      "chart:green-s6=2",
      "chart:green-not2=2",
      "chart:green-s11=2",
      "chart:green-s21=2",
    ]);
  });

  it("leaves both bands under their cap without a die", () => {
    for (const carrier of CARRIERS) {
      const bare = evasionFor(0, carrier.delta);
      expect(bare.dodgePct, carrier.id).toBeLessThan(DODGE_PCT_CAP);
      expect(bare.glancingPct, carrier.id).toBeLessThan(GLANCING_PCT_CAP);
    }
  });

  it("never pushes a band past its cap or under zero at any value", () => {
    for (const carrier of CARRIERS) {
      for (let value = 0; value <= 20; value += 1) {
        const evasion = evasionFor(value, carrier.delta);
        expect(evasion.dodgePct, carrier.id).toBeGreaterThanOrEqual(0);
        expect(evasion.glancingPct, carrier.id).toBeGreaterThanOrEqual(0);
        expect(evasion.dodgePct, carrier.id).toBeLessThanOrEqual(DODGE_PCT_CAP);
        expect(evasion.glancingPct, carrier.id).toBeLessThanOrEqual(
          GLANCING_PCT_CAP,
        );
      }
    }
  });

  it("keeps every ship tuning inside the Hound's ceiling", () => {
    for (const ship of PLAYABLE_SHIPS) {
      const tuning = evasionTuningFor(ship.id);
      for (let value = 0; value <= 24; value += 1) {
        const evasion = evasionFor(value, 0, tuning);
        expect(evasion.dodgePct, ship.id).toBeLessThanOrEqual(tuning.dodgeCap);
        expect(evasion.glancingPct, ship.id).toBeLessThanOrEqual(
          tuning.glancingCap,
        );
      }
      expect(tuning.dodgeCap, ship.id).toBeLessThanOrEqual(40);
      expect(tuning.glancingCap, ship.id).toBeLessThanOrEqual(55);
      expect(evasionFor(20, 0, tuning).glancingPct, ship.id).toBeGreaterThan(
        evasionFor(20, 0, tuning).dodgePct,
      );
    }
  });
});

describe("vulnerability math", () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [7, 4],
    [12, 4],
  ])("V %i → +%i", (value, d) => {
    expect(vulnerableFor(value)).toBe(d);
  });

  it("adds the mark bonus delta on top of the cap", () => {
    expect(vulnerableFor(12, 2)).toBe(6);
    expect(vulnerableFor(3, -1)).toBe(1);
  });
});

describe("resolution order", () => {
  it("resolves sensors → weapons → shields → engines → reactor", () => {
    const { beats } = resolvePlayerPhase(
      withPlacements({
        reactor: 2,
        engines: 3,
        shields: 3,
        weaponB: 4,
        weaponA: 4,
        sensors: 2,
      }),
    );
    expect(beats.map((b) => b.slot)).toEqual([
      "sensors",
      "weaponA",
      "weaponB",
      "shields",
      "engines",
      "reactor",
    ]);
  });
});

describe("sensors", () => {
  it("applies vulnerability at any value and never jams", () => {
    const { next, beats } = resolvePlayerPhase(withPlacements({ sensors: 1 }));
    expect(next.enemies[0]?.statuses.mark).toBe(1);
    expect(next.enemies[0]?.statuses.jam).toBeUndefined();
    expect(beats[0]?.sensor).toEqual({ vulnerable: 1, pierce: 0 });
  });

  it("scales vulnerability with the placed value", () => {
    const { next } = resolvePlayerPhase(withPlacements({ sensors: 7 }));
    expect(next.enemies[0]?.statuses.mark).toBe(4);
  });

  it("vulnerability raises every player hit that turn", () => {
    const { next } = resolvePlayerPhase(
      withPlacements(
        { sensors: 5, weaponA: 4, weaponB: 4 },
        { enemies: [mkEnemy()] },
      ),
    );
    expect(next.enemies[0]?.hp).toBe(4);
    expect(next.enemies[0]?.statuses.mark).toBe(3);
  });

  it("re-application keeps the larger magnitude", () => {
    const { next } = resolvePlayerPhase(
      withPlacements(
        { sensors: 3 },
        { enemies: [mkEnemy({ statuses: { mark: 4 } })] },
      ),
    );
    expect(next.enemies[0]?.statuses.mark).toBe(4);
  });

  it("a max face strips min(V, shield) from the target", () => {
    const shielded = mkEnemy({ shield: 3 });
    const { next, beats } = resolvePlayerPhase(
      withPlacements({ sensors: 20 }, { enemies: [shielded] }),
    );
    expect(beats[0]?.sensor?.pierce).toBe(3);
    expect(next.enemies[0]?.shield).toBe(0);
  });

  it("a max face strips no more than the placed value", () => {
    const shielded = mkEnemy({ shield: 9 });
    const { next, beats } = resolvePlayerPhase(
      withPlacements({ sensors: 20 }, { enemies: [shielded] }),
    );
    expect(beats[0]?.sensor?.pierce).toBe(9);
    expect(next.enemies[0]?.shield).toBe(0);
  });

  it("a sub-max face never pierces", () => {
    const shielded = mkEnemy({ shield: 4 });
    const { beats } = resolvePlayerPhase(
      withPlacements({ sensors: 5 }, { enemies: [shielded] }),
    );
    expect(beats[0]?.sensor?.pierce).toBe(0);
  });

  it("vulnerability expires when the next turn is rolled", () => {
    const marked = snap({ enemies: [mkEnemy({ statuses: { mark: 3 } })] });
    const next = advanceTurn(marked, createStreams(1));
    expect(next.enemies[0]?.statuses.mark).toBeUndefined();
  });

  it("jam reduces the enemy attack by 2 and is consumed", () => {
    const jammed = mkEnemy({ statuses: { jam: 1 }, nextIntent: { t: "attack", n: 5 } });
    const { next } = resolveEnemyPhase(
      snap({ enemies: [jammed] }),
      enemyStream(),
    );
    expect(next.hull).toBe(27);
    expect(next.enemies[0]?.statuses.jam).toBeUndefined();
  });
});

describe("engines", () => {
  const alwaysDodge = { dodgePct: 100, glancingPct: 0, intercept: false };
  const alwaysGlance = { dodgePct: 0, glancingPct: 100, intercept: false };

  it("rolls once per incoming hit", () => {
    const attacker = forceIntent(enemy("raider"), { t: "multi", n: 4, k: 3 });
    const { next, beats } = resolveEnemyPhase(
      snap({ enemies: [attacker], evasion: evasionFor(5) }),
      enemyStream(),
      createStream(3),
    );
    expect(next.hull).toBe(22);
    expect(beats[0]?.dodged).toBe(1);
    expect(beats[0]?.glanced).toBeUndefined();
  });

  it("a glancing hit is halved, rounded up", () => {
    const attacker = forceIntent(enemy("raider"), { t: "attack", n: 5 });
    const { next, beats } = resolveEnemyPhase(
      snap({ enemies: [attacker], evasion: evasionFor(3) }),
      enemyStream(),
      createStream(8),
    );
    expect(next.hull).toBe(27);
    expect(beats[0]?.glanced).toBe(1);
  });

  it("evades across enemies, not just the first hit", () => {
    const first = forceIntent(enemy("scavDrone"), { t: "attack", n: 2 });
    const second = forceIntent(enemy("scavDrone", { id: "enemy-1" }), {
      t: "attack",
      n: 3,
    });
    const { next } = resolveEnemyPhase(
      snap({ enemies: [first, second], evasion: alwaysDodge }),
      enemyStream(),
      createStream(3),
    );
    expect(next.hull).toBe(30);
  });

  it("an empty engines slot never rolls", () => {
    const attacker = forceIntent(enemy("raider"), { t: "multi", n: 3, k: 2 });
    const { next, beats } = resolveEnemyPhase(
      snap({ enemies: [attacker] }),
      enemyStream(),
      createStream(3),
    );
    expect(next.hull).toBe(24);
    expect(beats[0]?.dodged).toBeUndefined();
  });

  it("a glancing roll halves every hit it lands on", () => {
    const attacker = forceIntent(enemy("raider"), { t: "multi", n: 5, k: 2 });
    const { next, beats } = resolveEnemyPhase(
      snap({ enemies: [attacker], evasion: alwaysGlance }),
      enemyStream(),
      createStream(3),
    );
    expect(next.hull).toBe(24);
    expect(beats[0]?.glanced).toBe(2);
  });

  it("intercept grants weapons +1 once per turn on the first evasion", () => {
    const attacker = forceIntent(enemy("raider"), { t: "multi", n: 3, k: 3 });
    const { next } = resolveEnemyPhase(
      snap({
        enemies: [attacker],
        evasion: { dodgePct: 100, glancingPct: 0, intercept: true },
      }),
      enemyStream(),
      createStream(3),
    );
    expect(next.nextTurnMods.weapons).toBe(1);
  });

  it("intercept fires from a glancing hit, not only a dodge", () => {
    const attacker = forceIntent(enemy("raider"), { t: "multi", n: 3, k: 3 });
    const { next, beats } = resolveEnemyPhase(
      snap({
        enemies: [attacker],
        evasion: { dodgePct: 0, glancingPct: 100, intercept: true },
      }),
      enemyStream(),
      createStream(3),
    );
    expect(beats[0]?.dodged).toBeUndefined();
    expect(beats[0]?.glanced).toBe(3);
    expect(next.nextTurnMods.weapons).toBe(1);
  });

  it("no intercept below V 8", () => {
    const attacker = forceIntent(enemy("raider"), { t: "multi", n: 3, k: 3 });
    const { next } = resolveEnemyPhase(
      snap({ enemies: [attacker], evasion: alwaysDodge }),
      enemyStream(),
      createStream(3),
    );
    expect(next.nextTurnMods.weapons).toBeUndefined();
  });

  it("an engines die sets the turn's evasion", () => {
    const { next, beats } = resolvePlayerPhase(withPlacements({ engines: 7 }));
    expect(next.evasion).toEqual({
      dodgePct: 10,
      glancingPct: 25,
      intercept: false,
    });
    expect(beats[0]?.evasion).toEqual(next.evasion);
  });

  it("evasion clears when the next turn is rolled", () => {
    const rolled = advanceTurn(
      snap({ evasion: evasionFor(5) }),
      createStreams(1),
    );
    expect(rolled.evasion).toBeNull();
  });

  it("the same defense state replays the same outcome", () => {
    const attacker = () =>
      forceIntent(enemy("raider"), { t: "multi", n: 4, k: 3 });
    const board = () => snap({ enemies: [attacker()], evasion: evasionFor(5) });
    const streams = createStreams(7);
    const first = resolveEnemyPhase(board(), enemyStream(), streams.defense);
    const resumed = restoreStreams(serializeStreams(createStreams(7)));
    const second = resolveEnemyPhase(board(), enemyStream(), resumed.defense);
    expect(second.next.hull).toBe(first.next.hull);
    const third = resolveEnemyPhase(
      board(),
      enemyStream(),
      createStreamFromState(createStreams(7).defense.state()),
    );
    expect(third.next.hull).toBe(first.next.hull);
  });

  it("weapons +2 applies to weapon A and B next resolution, then is consumed", () => {
    const { next } = resolvePlayerPhase(
      withPlacements(
        { weaponA: 3, weaponB: 3 },
        { enemies: [mkEnemy()], nextTurnMods: { weapons: 2 } },
      ),
    );
    expect(next.enemies[0]?.hp).toBe(8);
    expect(next.nextTurnMods.weapons).toBeUndefined();
  });
});

describe("reactor economy", () => {
  it("stores charge up to the cap without overflow damage", () => {
    const { next } = resolvePlayerPhase(
      withPlacements({ reactor: 4 }, { charge: 6 }),
    );
    expect(next.charge).toBe(CHARGE_CAP);
    expect(next.hull).toBe(30);
  });

  it("overflow costs 2 hull and clamps the charge", () => {
    const { next, beats } = resolvePlayerPhase(
      withPlacements({ reactor: 6 }, { charge: 8 }),
    );
    expect(next.charge).toBe(CHARGE_CAP);
    expect(next.hull).toBe(28);
    expect(beats[0]?.overflowHull).toBe(2);
  });

  it("overflow can destroy the ship", () => {
    const { next } = resolvePlayerPhase(
      withPlacements({ reactor: 6 }, { charge: 8, hull: 2 }),
    );
    expect(next.hull).toBe(0);
    expect(next.outcome).toBe("defeat");
  });
});

describe("weapons and targeting", () => {
  it("hits the selected target in a two-enemy fight", () => {
    const a = mkEnemy({ hp: 18, hpMax: 18 });
    const b = mkEnemy({ id: "enemy-1", hp: 6, hpMax: 6 });
    const { next } = resolvePlayerPhase(
      withPlacements({ weaponA: 4 }, { enemies: [a, b], targetId: "enemy-1" }),
    );
    expect(next.enemies[1]?.hp).toBe(2);
    expect(next.enemies[0]?.hp).toBe(18);
  });

  it("auto-advances to the leftmost living enemy after a kill", () => {
    const a = mkEnemy({ hp: 3, hpMax: 3 });
    const b = mkEnemy({ id: "enemy-1", hp: 18, hpMax: 18 });
    const { next } = resolvePlayerPhase(
      withPlacements(
        { weaponA: 4, weaponB: 5 },
        { enemies: [a, b], targetId: "enemy-0" },
      ),
    );
    expect(next.enemies[0]?.hp).toBe(0);
    expect(next.enemies[1]?.hp).toBe(13);
    expect(next.targetId).toBe("enemy-1");
  });

  it("falls back to the first living enemy when the target is dead", () => {
    const { next, beats } = resolvePlayerPhase(
      withPlacements(
        { weaponA: 4 },
        {
          enemies: [
            mkEnemy({ hp: 0, hpMax: 18 }),
            mkEnemy({ id: "enemy-1", hp: 9, hpMax: 18 }),
          ],
          targetId: "enemy-0",
        },
      ),
    );
    expect(next.enemies[1]?.hp).toBe(5);
    expect(beats[0]?.targetId).toBe("enemy-1");
  });
});

describe("statuses on enemies", () => {
  it("burn ticks at the end of the enemy turn and decays", () => {
    const burning = mkEnemy({
      nextIntent: { t: "shield", n: 5 },
      statuses: { burn: 3 },
    });
    const { next, beats } = resolveEnemyPhase(
      snap({ enemies: [burning] }),
      enemyStream(),
    );
    expect(next.enemies[0]?.hp).toBe(15);
    expect(next.enemies[0]?.statuses.burn).toBe(2);
    expect(beats.at(-1)?.kind).toBe("burnTick");
  });

  it("burn kills grant victory", () => {
    const burning = mkEnemy({
      hp: 2,
      hpMax: 18,
      nextIntent: { t: "shield", n: 5 },
      statuses: { burn: 3 },
    });
    const { next } = resolveEnemyPhase(
      snap({ enemies: [burning] }),
      enemyStream(),
    );
    expect(next.enemies[0]?.hp).toBe(0);
    expect(next.outcome).toBe("victory");
  });

  it("charge doubles the next attack and is consumed", () => {
    const charged = mkEnemy({
      statuses: { charge: 1 },
      nextIntent: { t: "attack", n: 8 },
    });
    const { next } = resolveEnemyPhase(
      snap({ enemies: [charged] }),
      enemyStream(),
    );
    expect(next.hull).toBe(14);
    expect(next.enemies[0]?.statuses.charge).toBeUndefined();
  });
});

describe("anti-mechanics", () => {
  it("jammerCorvette blocks one slot for one turn", () => {
    const corvette = forceIntent(enemy("jammerCorvette"), { t: "jamSlot" });
    const { next, beats } = resolveEnemyPhase(
      snap({ enemies: [corvette] }),
      enemyStream(),
    );
    expect(next.blockedSlots).toHaveLength(1);
    expect(next.blockedSlots[0]?.untilTurn).toBe(2);
    const jamBeat = beats.find((b) => b.kind === "jamSlot");
    expect(jamBeat?.slot).toBe(next.blockedSlots[0]?.slot);

    const afterAdvance = advanceTurn(next, createStreams(5));
    const blockedSlot = afterAdvance.blockedSlots[0]?.slot;
    expect(blockedSlot).toBeDefined();
    afterAdvance.dice.push(die("die-x", 2));
    if (blockedSlot !== undefined) {
      expect(canPlaceDie(afterAdvance, "die-x", blockedSlot)).toBe(false);
    }
    const released = advanceTurn(afterAdvance, createStreams(6));
    expect(released.blockedSlots).toHaveLength(0);
  });

  it("leechSkiff locks a tray die: it keeps its value, sits out, then releases", () => {
    const skiff = forceIntent(enemy("leechSkiff"), { t: "lockDie" });
    const base = snap({ enemies: [skiff] });
    base.dice.push(die("die-a", 5), die("die-b", 2));
    const { next } = resolveEnemyPhase(base, enemyStream());
    expect(next.lockedDice).toHaveLength(1);

    const lockedUid = next.lockedDice[0]?.uid ?? "";
    const afterAdvance = advanceTurn(next, createStreams(5));
    const lockedDie = afterAdvance.dice.find((d) => d.uid === lockedUid);
    const original = base.dice.find((d) => d.uid === lockedUid);
    expect(lockedDie?.state).toBe("locked");
    expect(lockedDie?.value).toBe(original?.value);
    expect(canPlaceDie(afterAdvance, lockedUid, "weaponA")).toBe(false);

    const released = advanceTurn(afterAdvance, createStreams(6));
    expect(released.lockedDice).toHaveLength(0);
    expect(released.dice.find((d) => d.uid === lockedUid)?.state).toBe("tray");
  });

  it("leechSkiff finds no lock target when no dice are in the tray", () => {
    const skiff = forceIntent(enemy("leechSkiff"), { t: "lockDie" });
    const { next } = resolveEnemyPhase(
      snap({ enemies: [skiff] }),
      enemyStream(),
    );
    expect(next.lockedDice).toHaveLength(0);
  });

  it("riftWasp death blocks weaponA for the following turn", () => {
    const wasp = enemy("riftWasp", { hp: 3 });
    const { next } = resolvePlayerPhase(
      withPlacements({ weaponA: 4 }, { enemies: [wasp] }),
    );
    expect(next.outcome).toBe("victory");
    expect(next.blockedSlots).toEqual([{ slot: "weaponA", untilTurn: 2 }]);
  });

  it("summon adds an enemy up to the cap of three", () => {
    const summoner = forceIntent(enemy("raider"), { t: "summon", id: "mine" });
    const { next } = resolveEnemyPhase(
      snap({ enemies: [summoner] }),
      enemyStream(),
    );
    expect(next.enemies).toHaveLength(2);
    expect(next.enemies[1]?.defId).toBe("mine");

    const full = snap({
      enemies: [
        forceIntent(enemy("raider"), { t: "summon", id: "mine" }),
        enemy("scavDrone", { id: "enemy-1" }),
        enemy("scavDrone", { id: "enemy-2" }),
      ],
    });
    const capped = resolveEnemyPhase(full, enemyStream());
    expect(capped.next.enemies).toHaveLength(3);
  });
});

describe("roster behaviors", () => {
  it("mineCluster ticks 3 hull with all mines alive and degrades per kill", () => {
    const mines = buildEnemies(["mineCluster"], enemyStream());
    expect(mines).toHaveLength(3);
    const { next } = resolveEnemyPhase(snap({ enemies: mines }), enemyStream());
    expect(next.hull).toBe(27);

    const twoDead = next.enemies.map((e, i) =>
      i < 2 ? { ...e, hp: 0 } : e,
    );
    const second = resolveEnemyPhase(
      snap({ enemies: twoDead, hull: 27 }),
      enemyStream(),
    );
    expect(second.next.hull).toBe(26);
  });

  it("shieldWarden shields every living ally", () => {
    const warden = forceIntent(enemy("shieldWarden"), { t: "shieldAll", n: 5 });
    const drone = forceIntent(enemy("scavDrone", { id: "enemy-1" }), {
      t: "attack",
      n: 2,
    });
    const { next } = resolveEnemyPhase(
      snap({ enemies: [warden, drone] }),
      enemyStream(),
    );
    expect(next.enemies[0]?.shield).toBe(5);
    expect(next.enemies[1]?.shield).toBe(5);
  });

  it("raiderAlpha turret aura adds +2 while alive and stops immediately on kill", () => {
    const alpha = forceIntent(enemy("raiderAlpha"), { t: "attack", n: 5 });
    const withTurret = resolveEnemyPhase(
      snap({ enemies: [structuredClone(alpha)] }),
      enemyStream(),
    );
    expect(withTurret.next.hull).toBe(23);

    const killed = structuredClone(alpha);
    const turret = killed.subsystems[0];
    if (turret !== undefined) turret.hp = 0;
    const withoutTurret = resolveEnemyPhase(
      snap({ enemies: [killed] }),
      enemyStream(),
    );
    expect(withoutTurret.next.hull).toBe(25);
  });

  it("weapons can target and destroy a subsystem, then retarget the parent", () => {
    const alpha = enemy("raiderAlpha");
    const turretHp = alpha.subsystems[0]?.hpMax ?? 0;
    const parentHp = alpha.hp;
    const { next } = resolvePlayerPhase(
      withPlacements(
        { weaponA: turretHp },
        { enemies: [alpha], targetId: "enemy-0:turret" },
      ),
    );
    expect(next.enemies[0]?.subsystems[0]?.hp).toBe(0);
    expect(next.enemies[0]?.hp).toBe(parentHp);
    expect(next.targetId).toBe("enemy-0");
  });

  it("raiderAlpha weighted step draws deterministically from the pick", () => {
    const def = ENEMY_BY_ID.get("raiderAlpha");
    expect(def).toBeDefined();
    if (def === undefined) return;
    const step = def.pattern[1];
    expect(step).toBeDefined();
    if (step === undefined || !("pick" in step)) throw new Error("expected a pick step");
    const allowed = step.pick.map(([intent]) => intent.t);
    const stream = enemyStream();
    const draws = Array.from({ length: 20 }, () => drawIntent(def, 1, stream));
    for (const intent of draws) {
      expect(allowed).toContain(intent.t);
    }
    const streamA = createStream(77);
    const streamB = createStream(77);
    expect(drawIntent(def, 1, streamA)).toEqual(drawIntent(def, 1, streamB));
  });
});

describe("spinal mount", () => {
  const spinalSnap = (value: number, over: Partial<BattleSnapshot> = {}) =>
    withPlacements(
      { spinal: value },
      {
        enemies: [mkEnemy()],
        slots: {
          spinal: { cap: 20, mk: 1, jamOn: 4 },
          shields: { cap: 8, mk: 1 },
          reactor: { cap: 10, mk: 1 },
        },
        ...over,
      },
    );

  it("jams on 3: no damage, +2 next turn", () => {
    const { next, beats } = resolvePlayerPhase(spinalSnap(3));
    expect(next.enemies[0]?.hp).toBe(18);
    expect(next.nextTurnMods.spinal).toBe(2);
    expect(beats[0]?.kind).toBe("spinalJam");
  });

  it("hits for 17 on 17", () => {
    const { next } = resolvePlayerPhase(spinalSnap(17));
    expect(next.enemies[0]?.hp).toBe(1);
  });

  it("consecutive jams accumulate and a hit consumes the bonus", () => {
    const first = resolvePlayerPhase(spinalSnap(3));
    expect(first.next.nextTurnMods.spinal).toBe(2);
    const second = resolvePlayerPhase(
      spinalSnap(4, { nextTurnMods: first.next.nextTurnMods }),
    );
    expect(second.next.nextTurnMods.spinal).toBe(4);
    const third = resolvePlayerPhase(
      spinalSnap(10, { nextTurnMods: second.next.nextTurnMods }),
    );
    expect(third.next.enemies[0]?.hp).toBe(4);
    expect(third.next.nextTurnMods.spinal).toBeUndefined();
  });
});

describe("advanceTurn", () => {
  it("rerolls unlocked dice, keeps the reserved value, clears slots", () => {
    const base = withPlacements({ weaponA: 4 });
    base.dice.push({ ...die("die-r", 6), state: "reserved" });
    base.dice.push(die("die-t", 2));
    const next = advanceTurn(base, createStreams(99));
    expect(next.turn).toBe(2);
    const reserved = next.dice.find((d) => d.uid === "die-r");
    expect(reserved?.state).toBe("tray");
    expect(reserved?.value).toBe(6);
    expect(next.slots.weaponA?.dieUid).toBeUndefined();
    for (const d of next.dice) {
      expect(d.value).toBeGreaterThanOrEqual(1);
      expect(d.value).toBeLessThanOrEqual(d.tier);
    }
  });

  it("surge bonus applies to fresh rolls only and resets", () => {
    const base = snap({ nextRollBonus: 1 });
    base.dice.push(die("die-a", 1), { ...die("die-r", 3), state: "reserved" });
    const plain = snap();
    plain.dice.push(die("die-a", 1), { ...die("die-r", 3), state: "reserved" });

    const boosted = advanceTurn(base, createStreams(42));
    const control = advanceTurn(plain, createStreams(42));
    const boostedA = boosted.dice.find((d) => d.uid === "die-a");
    const controlA = control.dice.find((d) => d.uid === "die-a");
    expect(boostedA?.value).toBe(
      Math.min(6, (controlA?.value ?? 0) + 1),
    );
    expect(boosted.dice.find((d) => d.uid === "die-r")?.value).toBe(3);
    expect(boosted.nextRollBonus).toBe(0);
  });

  it("is deterministic for a seeded stream", () => {
    const a = advanceTurn(withPlacements({ weaponA: 4 }), createStreams(7));
    const b = advanceTurn(withPlacements({ weaponA: 4 }), createStreams(7));
    expect(a.dice.map((d) => d.value)).toEqual(b.dice.map((d) => d.value));
  });

  it("keeps reactor charge and pending mods across turns", () => {
    const next = advanceTurn(
      snap({ charge: 6, nextTurnMods: { weapons: 2 } }),
      createStreams(1),
    );
    expect(next.charge).toBe(6);
    expect(next.nextTurnMods.weapons).toBe(2);
  });
});

describe("enemy phase basics", () => {
  it("attack is absorbed by player shield before hull and shield resets", () => {
    const { next, beats } = resolveEnemyPhase(
      snap({ shield: 3, enemies: [mkEnemy()] }),
      enemyStream(),
    );
    expect(next.hull).toBe(28);
    expect(beats[0]?.shieldDamage).toBe(3);
    expect(beats[0]?.hullDamage).toBe(2);
    expect(next.shield).toBe(0);
  });

  it("lethal attack floors hull at 0 and detects defeat", () => {
    const { next } = resolveEnemyPhase(
      snap({ hull: 3, enemies: [mkEnemy()] }),
      enemyStream(),
    );
    expect(next.hull).toBe(0);
    expect(next.outcome).toBe("defeat");
  });

  it("dead enemies do not act", () => {
    const { next, beats } = resolveEnemyPhase(
      snap({ enemies: [mkEnemy({ hp: 0 })] }),
      enemyStream(),
    );
    expect(beats).toEqual([]);
    expect(next.hull).toBe(30);
  });

  it("intent pattern advances and redraws nextIntent", () => {
    const def = ENEMY_BY_ID.get("raider");
    const step = def?.pattern[1];
    const { next } = resolveEnemyPhase(snap(), enemyStream());
    expect(next.enemies[0]?.intentIndex).toBe(1);
    if (step !== undefined) {
      expect(intentsOfStep(step)).toContainEqual(next.enemies[0]?.nextIntent);
    }
  });
});
