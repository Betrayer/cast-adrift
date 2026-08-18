import { beforeEach, describe, expect, it } from "vitest";
import type { MkLevels } from "@/game/battle/setup";
import { resolveEnemyPhase, resolvePlayerPhase } from "@/game/battle/resolver";
import {
  enemyForecast,
  expectedHit,
  legalTargets,
  projectSlot,
  type SlotProjection,
} from "@/game/battle/view";
import { createStream, createStreams, type RngStream } from "@/services/rng";
import {
  battleSnapshot,
  useBattleStore,
  type BattleEncounter,
} from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";
import type { EngravingMap } from "@/data/engravings";
import type { ShipId } from "@/data/ships";
import type { SlotId } from "@/types/battle";

const DECKS: readonly (readonly string[])[] = [
  ["ember", "frostplate", "sprout", "grey-d4", "ashen", "coreshard"],
  ["cinder", "hoarfrost", "coil", "shim", "pitch", "glimmer"],
  ["salvo", "bulwark", "bramble", "spool", "slag", "prismChip"],
  ["magma", "aegis", "taproot", "plumbline", "obsidian", "facet"],
  ["red-d6", "blue-d6", "green-d4", "grey-d4", "black-d6", "yellow-d6"],
  ["thermite", "stillwater", "seedpod", "lodestar", "tar", "spectra"],
  ["eclipse", "abyss", "ashen", "pitch", "ember", "frostplate"],
];

const PERK_SETS: readonly (readonly string[])[] = [
  [],
  ["targeter"],
  ["afterburner"],
  ["kindling", "hammerhead"],
  ["targeter", "afterburner"],
  ["openingVolley"],
];

const SHIPS: readonly ShipId[] = ["wanderer", "ram", "ark"];

const MK_SETS: readonly MkLevels[] = [
  {},
  { weaponA: 2, shields: 2 },
  { weaponA: 3, sensors: 2, engines: 2 },
  { reactor: 2, weaponB: 2 },
];

const ENGRAVING_SETS: readonly EngravingMap[] = [
  {},
  { ember: ["sting"] },
  { "grey-d4": ["lens"] },
  { frostplate: ["bastion"] },
];

const ENEMIES: readonly (readonly string[])[] = [
  ["raider"],
  ["raider", "scavDrone"],
  ["anchorHulk"],
];

interface CaseSpec {
  deck: readonly string[];
  perks: readonly string[];
  ship: ShipId;
  mk: MkLevels;
  engravings: EngravingMap;
  enemyIds: readonly string[];
  inverted: boolean;
  seed: number;
}

const specFor = (index: number): CaseSpec => ({
  deck: DECKS[index % DECKS.length] ?? DECKS[0] ?? [],
  perks: PERK_SETS[index % PERK_SETS.length] ?? [],
  ship: SHIPS[index % SHIPS.length] ?? "wanderer",
  mk: MK_SETS[index % MK_SETS.length] ?? {},
  engravings: ENGRAVING_SETS[index % ENGRAVING_SETS.length] ?? {},
  enemyIds: ENEMIES[index % ENEMIES.length] ?? ["raider"],
  inverted: index % 7 === 0,
  seed: 1000 + index * 37,
});

const startCase = (spec: CaseSpec): void => {
  useRunStore.setState({ mkLevels: spec.mk });
  const encounter: BattleEncounter = {
    enemyIds: [...spec.enemyIds],
    shipId: spec.ship,
    perks: spec.perks,
    engravings: spec.engravings,
    hull: 24,
    hullMax: 30,
    startCharge: 4,
    inverted: spec.inverted,
  };
  useBattleStore.getState().reset();
  useBattleStore
    .getState()
    .startBattle(encounter, spec.deck, createStreams(spec.seed));
};

interface Chosen {
  uid: string;
  slotId: SlotId;
}

const choose = (stream: RngStream): Chosen | null => {
  const board = useBattleStore.getState();
  const tray = board.dice.filter((d) => d.state === "tray");
  if (tray.length === 0) return null;
  const shuffled = stream.shuffle(tray);
  for (const die of shuffled) {
    const targets = legalTargets(board, die.uid);
    if (targets.slots.length === 0) continue;
    return { uid: die.uid, slotId: stream.pick(targets.slots) };
  }
  return null;
};

const resolvedFor = (slotId: SlotId): SlotProjection => {
  const beats = useBattleStore
    .getState()
    .beats.filter((b) => b.slot === slotId);
  const head = beats[0];
  return {
    slotId,
    kind: head?.kind ?? null,
    base: 0,
    value: head?.value ?? 0,
    bonus: 0,
    amount: beats.reduce((sum, b) => sum + b.amount, 0),
    inherited: null,
    evasion: head?.evasion ?? null,
    sensor: head?.sensor ?? null,
    overflowHull: beats.reduce((sum, b) => sum + (b.overflowHull ?? 0), 0),
    jammed: beats.some((b) => b.kind === "spinalJam"),
  };
};

const CASES = 240;

describe("projection matches the resolution it predicts", () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
  });

  it(`holds for ${String(CASES)} seeded (die, slot, loadout) triples`, () => {
    let checked = 0;
    let inverted = 0;
    let exceeded = 0;
    let engraved = 0;
    let affinity = 0;
    for (let index = 0; index < CASES; index += 1) {
      const spec = specFor(index);
      startCase(spec);
      const picker = createStream(spec.seed ^ 0x5f5f);
      const chosen = choose(picker);
      if (chosen === null) continue;

      const before = useBattleStore.getState();
      const die = before.dice.find((d) => d.uid === chosen.uid);
      if (spec.inverted) inverted += 1;
      if (Object.keys(spec.engravings).includes(die?.defId ?? "")) engraved += 1;
      if ((die?.tier ?? 0) > (before.slots[chosen.slotId]?.cap ?? 0)) {
        exceeded += 1;
      }

      const projection = projectSlot(
        battleSnapshot(useBattleStore.getState()),
        chosen.uid,
        chosen.slotId,
      );
      expect(projection).not.toBeNull();
      if (projection === null) continue;
      if (projection.bonus !== 0) affinity += 1;

      useBattleStore.getState().placeDie(chosen.uid, chosen.slotId);
      expect(useBattleStore.getState().slots[chosen.slotId]?.dieUid).toBe(
        chosen.uid,
      );
      useBattleStore.getState().endTurn();

      const actual = resolvedFor(chosen.slotId);
      expect({
        case: index,
        kind: projection.kind,
        value: projection.value,
        amount: projection.amount,
        evasion: projection.evasion,
        sensor: projection.sensor,
        overflowHull: projection.overflowHull,
        jammed: projection.jammed,
      }).toEqual({
        case: index,
        kind: actual.kind,
        value: actual.value,
        amount: actual.amount,
        evasion: actual.evasion,
        sensor: actual.sensor,
        overflowHull: actual.overflowHull,
        jammed: actual.jammed,
      });
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(200);
    expect({
      inverted: inverted > 0,
      exceeded: exceeded > 0,
      engraved: engraved > 0,
      affinity: affinity > 0,
    }).toEqual({
      inverted: true,
      exceeded: true,
      engraved: true,
      affinity: true,
    });
  });

  it("reports the affinity bonus as the difference from the face", () => {
    startCase({ ...specFor(0), deck: ["ember", "ember", "ember"] });
    const board = useBattleStore.getState();
    const die = board.dice[0];
    expect(die).toBeDefined();
    if (die === undefined) return;
    const projection = projectSlot(
      battleSnapshot(board),
      die.uid,
      "weaponA",
    );
    expect(projection?.base).toBe(die.value);
    expect(projection?.bonus).toBe((projection?.value ?? 0) - die.value);
    expect(projection?.bonus).toBeGreaterThanOrEqual(2);
  });

  it("names the school a prismatic die inherits in each slot", () => {
    startCase({ ...specFor(0), deck: ["coreshard", "coreshard"] });
    const board = useBattleStore.getState();
    const die = board.dice[0];
    if (die === undefined) return;
    const snapshot = battleSnapshot(board);
    expect(projectSlot(snapshot, die.uid, "weaponA")?.inherited).toBe("red");
    expect(projectSlot(snapshot, die.uid, "shields")?.inherited).toBe("blue");
    expect(projectSlot(snapshot, die.uid, "sensors")?.inherited).toBe("grey");
  });
});

describe("enemy forecast", () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
  });

  it("equals the damage actually taken when nothing dodges", () => {
    let checked = 0;
    for (let index = 0; index < 140; index += 1) {
      const spec = { ...specFor(index), enemyIds: ["raider"] as const };
      startCase(spec);
      const board = useBattleStore.getState();
      const snapshot = battleSnapshot(board);
      if (snapshot.evasion !== null) continue;
      const forecast = enemyForecast(snapshot);
      if (forecast.ends !== null) continue;
      if (forecast.evasion !== null) continue;

      useBattleStore.getState().endTurn();
      const attacks = useBattleStore
        .getState()
        .enemyBeats.filter((b) => b.kind === "attack");
      const hull = attacks.reduce((sum, b) => sum + b.hullDamage, 0);
      const shielded = attacks.reduce((sum, b) => sum + b.shieldDamage, 0);
      expect({ case: index, hull, shielded, raw: forecast.raw }).toEqual({
        case: index,
        hull: forecast.toHull,
        shielded: forecast.toShield,
        raw: forecast.incoming,
      });
      checked += 1;
    }
    expect(checked).toBeGreaterThanOrEqual(50);
  });

  it("reads evasion as the mean over the whole defense stream", () => {
    startCase({ ...specFor(2), deck: ["sprout", "sprout", "sprout"], enemyIds: ["raider"] });
    const board = useBattleStore.getState();
    const die = board.dice.find((d) => d.state === "tray");
    if (die === undefined) return;
    useBattleStore.getState().placeDie(die.uid, "engines");

    const snapshot = battleSnapshot(useBattleStore.getState());
    const forecast = enemyForecast(snapshot);
    expect(forecast.evasion).not.toBeNull();
    expect((forecast.evasion?.dodgePct ?? 0) > 0).toBe(true);

    const player = resolvePlayerPhase(snapshot);
    let total = 0;
    for (let roll = 1; roll <= 100; roll += 1) {
      const pinned: RngStream = {
        next: () => roll / 100,
        int: () => roll,
        pick: <T,>(arr: readonly T[]): T => arr[0] as T,
        weighted: <T,>(entries: readonly (readonly [T, number])[]): T =>
          entries[0]?.[0] as T,
        shuffle: <T,>(arr: readonly T[]): T[] => [...arr],
        state: () => roll,
      };
      const enemy = resolveEnemyPhase(
        player.next,
        createStream(11),
        pinned,
      );
      const attacks = enemy.beats.filter((b) => b.kind === "attack");
      total += attacks.reduce(
        (sum, b) => sum + b.hullDamage + b.shieldDamage,
        0,
      );
    }
    expect(total / 100).toBeCloseTo(forecast.incoming, 0);
  });

  it("expectedHit halves a glancing hit and drops a dodged one", () => {
    expect(expectedHit(10, null)).toBe(10);
    expect(expectedHit(10, { dodgePct: 100, glancingPct: 0, intercept: false })).toBe(0);
    expect(
      expectedHit(10, { dodgePct: 0, glancingPct: 100, intercept: false }),
    ).toBe(5);
  });
});
