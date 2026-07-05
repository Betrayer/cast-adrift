import { describe, expect, it } from "vitest";
import {
  advanceTurn,
  CHARGE_CAP,
  resolveEnemyPhase,
  resolvePlayerPhase,
} from "@/game/battle/resolver";
import { createStreams } from "@/services/rng";
import type {
  BattleSnapshot,
  EnemyState,
  RolledDie,
  SlotId,
} from "@/types/battle";
import type { DieTier } from "@/types/content";

const raider = (over: Partial<EnemyState> = {}): EnemyState => ({
  id: "enemy-0",
  defId: "raider",
  hp: 18,
  hpMax: 18,
  shield: 0,
  intentIndex: 0,
  ...over,
});

const die = (
  uid: string,
  value: number,
  slot?: SlotId,
  tier: DieTier = 6,
): RolledDie => ({
  uid,
  defId: "red-d6",
  tier,
  school: "red",
  value,
  state: slot === undefined ? "tray" : "placed",
  slot,
});

const snap = (over: Partial<BattleSnapshot> = {}): BattleSnapshot => ({
  turn: 1,
  hull: 30,
  hullMax: 30,
  shield: 0,
  charge: 0,
  dice: [],
  slots: {
    weaponA: { cap: 8, mk: 1 },
    shields: { cap: 8, mk: 1 },
    reactor: { cap: 10, mk: 1 },
  },
  enemies: [raider()],
  targetId: "enemy-0",
  ...over,
});

const withPlacements = (
  placements: Partial<Record<"weaponA" | "shields" | "reactor", number>>,
  over: Partial<BattleSnapshot> = {},
): BattleSnapshot => {
  const dice: RolledDie[] = [];
  const base = snap(over);
  for (const [slotId, value] of Object.entries(placements) as [
    "weaponA" | "shields" | "reactor",
    number,
  ][]) {
    const uid = `die-${slotId}`;
    dice.push(die(uid, value, slotId));
    const slot = base.slots[slotId];
    if (slot !== undefined) slot.dieUid = uid;
  }
  base.dice = dice;
  return base;
};

describe("resolvePlayerPhase", () => {
  it("weaponA deals full value to an unshielded hull", () => {
    const { next, beats } = resolvePlayerPhase(withPlacements({ weaponA: 4 }));
    expect(next.enemies[0]?.hp).toBe(14);
    expect(beats).toEqual([
      { slot: "weaponA", kind: "damage", amount: 4, targetId: "enemy-0" },
    ]);
  });

  it("weaponA hits enemy shield first, remainder goes to hp", () => {
    const { next } = resolvePlayerPhase(
      withPlacements({ weaponA: 5 }, { enemies: [raider({ shield: 3 })] }),
    );
    expect(next.enemies[0]?.shield).toBe(0);
    expect(next.enemies[0]?.hp).toBe(16);
  });

  it("weaponA fully absorbed by a larger enemy shield", () => {
    const { next } = resolvePlayerPhase(
      withPlacements({ weaponA: 3 }, { enemies: [raider({ shield: 5 })] }),
    );
    expect(next.enemies[0]?.shield).toBe(2);
    expect(next.enemies[0]?.hp).toBe(18);
  });

  it("overkill floors hp at 0 and detects victory", () => {
    const { next } = resolvePlayerPhase(
      withPlacements({ weaponA: 6 }, { enemies: [raider({ hp: 2 })] }),
    );
    expect(next.enemies[0]?.hp).toBe(0);
    expect(next.outcome).toBe("victory");
  });

  it("remaining slots still resolve after the kill", () => {
    const { next, beats } = resolvePlayerPhase(
      withPlacements(
        { weaponA: 6, shields: 5, reactor: 4 },
        { enemies: [raider({ hp: 2 })] },
      ),
    );
    expect(next.outcome).toBe("victory");
    expect(next.shield).toBe(5);
    expect(next.charge).toBe(4);
    expect(beats).toHaveLength(3);
  });

  it("shields slot adds player shield", () => {
    const { next, beats } = resolvePlayerPhase(withPlacements({ shields: 5 }));
    expect(next.shield).toBe(5);
    expect(beats).toEqual([{ slot: "shields", kind: "shield", amount: 5 }]);
  });

  it("reactor stores charge", () => {
    const { next, beats } = resolvePlayerPhase(withPlacements({ reactor: 4 }));
    expect(next.charge).toBe(4);
    expect(beats).toEqual([{ slot: "reactor", kind: "charge", amount: 4 }]);
  });

  it("reactor charge caps at 10", () => {
    const { next } = resolvePlayerPhase(
      withPlacements({ reactor: 6 }, { charge: 8 }),
    );
    expect(next.charge).toBe(CHARGE_CAP);
  });

  it("resolves in fixed order weaponA → shields → reactor", () => {
    const { beats } = resolvePlayerPhase(
      withPlacements({ reactor: 2, shields: 3, weaponA: 4 }),
    );
    expect(beats.map((b) => b.slot)).toEqual(["weaponA", "shields", "reactor"]);
  });

  it("empty board produces no beats and no state change", () => {
    const before = snap();
    const { next, beats } = resolvePlayerPhase(before);
    expect(beats).toEqual([]);
    expect(next.enemies[0]?.hp).toBe(18);
    expect(next.shield).toBe(0);
    expect(next.charge).toBe(0);
  });

  it("retargets the first living enemy when the target is dead", () => {
    const second = raider({ id: "enemy-1", hp: 9 });
    const { next, beats } = resolvePlayerPhase(
      withPlacements(
        { weaponA: 4 },
        { enemies: [raider({ hp: 0 }), second], targetId: "enemy-0" },
      ),
    );
    expect(next.enemies[1]?.hp).toBe(5);
    expect(beats[0]?.targetId).toBe("enemy-1");
  });
});

describe("resolveEnemyPhase", () => {
  it("attack is absorbed by player shield before hull", () => {
    const { next, beats } = resolveEnemyPhase(snap({ shield: 5 }));
    expect(next.hull).toBe(30);
    expect(beats[0]).toEqual({
      enemyId: "enemy-0",
      intent: { t: "attack", n: 5 },
      hullDamage: 0,
      shieldDamage: 5,
    });
  });

  it("attack overflow damages hull", () => {
    const { next, beats } = resolveEnemyPhase(
      snap({ shield: 3, enemies: [raider({ intentIndex: 1 })] }),
    );
    expect(next.hull).toBe(26);
    expect(beats[0]?.hullDamage).toBe(4);
    expect(beats[0]?.shieldDamage).toBe(3);
  });

  it("player shield resets to 0 at end of enemy turn", () => {
    const { next } = resolveEnemyPhase(snap({ shield: 20 }));
    expect(next.shield).toBe(0);
  });

  it("shield intent adds enemy shield and advances the pattern", () => {
    const { next } = resolveEnemyPhase(
      snap({ enemies: [raider({ intentIndex: 2 })] }),
    );
    expect(next.enemies[0]?.shield).toBe(5);
    expect(next.enemies[0]?.intentIndex).toBe(0);
    expect(next.hull).toBe(30);
  });

  it("pattern cycles attack 5 → attack 7 → shield 5 → attack 5", () => {
    let current = snap();
    const seen: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const enemy = current.enemies[0];
      if (enemy === undefined) throw new Error("missing enemy");
      seen.push(enemy.intentIndex);
      current = resolveEnemyPhase(current).next;
      current.hull = 30;
    }
    expect(seen).toEqual([0, 1, 2, 0]);
  });

  it("lethal attack floors hull at 0 and detects defeat", () => {
    const { next } = resolveEnemyPhase(snap({ hull: 3 }));
    expect(next.hull).toBe(0);
    expect(next.outcome).toBe("defeat");
  });

  it("dead enemies do not act", () => {
    const { next, beats } = resolveEnemyPhase(
      snap({ enemies: [raider({ hp: 0 })] }),
    );
    expect(beats).toEqual([]);
    expect(next.hull).toBe(30);
  });
});

describe("advanceTurn", () => {
  it("rerolls the whole deck, clears slots, increments turn", () => {
    const streams = createStreams(99);
    const before = withPlacements({ weaponA: 4, shields: 5 });
    before.dice.push(die("die-tray", 6));
    const next = advanceTurn(before, streams);
    expect(next.turn).toBe(2);
    expect(next.dice).toHaveLength(3);
    for (const d of next.dice) {
      expect(d.state).toBe("tray");
      expect(d.slot).toBeUndefined();
      expect(d.value).toBeGreaterThanOrEqual(1);
      expect(d.value).toBeLessThanOrEqual(d.tier);
    }
    expect(next.slots.weaponA?.dieUid).toBeUndefined();
    expect(next.slots.shields?.dieUid).toBeUndefined();
  });

  it("is deterministic for a seeded stream", () => {
    const a = advanceTurn(withPlacements({ weaponA: 4 }), createStreams(7));
    const b = advanceTurn(withPlacements({ weaponA: 4 }), createStreams(7));
    expect(a.dice.map((d) => d.value)).toEqual(b.dice.map((d) => d.value));
  });

  it("keeps reactor charge across turns", () => {
    const next = advanceTurn(snap({ charge: 6 }), createStreams(1));
    expect(next.charge).toBe(6);
  });
});
