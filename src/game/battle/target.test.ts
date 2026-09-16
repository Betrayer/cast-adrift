import { describe, expect, it } from "vitest";
import { harnessEnemy } from "@/game/battle/battleHarness";
import { aimedEnemy } from "@/game/battle/target";
import type { EnemyState } from "@/types/battle";

const mkEnemy = (over: Partial<EnemyState> = {}): EnemyState =>
  harnessEnemy({ hp: 18, hpMax: 18, ...over });

const first = mkEnemy({ id: "enemy-0", statuses: { mark: 4 } });
const second = mkEnemy({ id: "enemy-1" });

describe("aimedEnemy resolves what the target id points at", () => {
  it("returns the enemy when the id names an enemy", () => {
    expect(aimedEnemy([first, second], "enemy-1")?.id).toBe("enemy-1");
  });

  it("returns the parent when the id names a subsystem", () => {
    expect(aimedEnemy([first, second], "enemy-1:turret")?.id).toBe("enemy-1");
  });

  it("does not fall back to the first enemy for a live subsystem target", () => {
    expect(aimedEnemy([first, second], "enemy-1:turret")?.statuses.mark).toBeUndefined();
  });

  it("falls back to the first living enemy when the parent is dead", () => {
    const dead = mkEnemy({ id: "enemy-1", hp: 0 });
    expect(aimedEnemy([first, dead], "enemy-1:turret")?.id).toBe("enemy-0");
  });

  it("falls back to the first living enemy with no target", () => {
    expect(aimedEnemy([first, second], null)?.id).toBe("enemy-0");
  });

  it("skips the dead when picking the fallback", () => {
    const deadFirst = mkEnemy({ id: "enemy-0", hp: 0 });
    expect(aimedEnemy([deadFirst, second], null)?.id).toBe("enemy-1");
  });

  it("returns undefined when nothing is alive", () => {
    expect(aimedEnemy([mkEnemy({ hp: 0 })], null)).toBeUndefined();
  });
});
