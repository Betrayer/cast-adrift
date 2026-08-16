import { describe, expect, it } from "vitest";
import {
  harnessDie,
  harnessEnemy,
  harnessSnap,
  place,
} from "@/game/battle/battleHarness";
import { resolvePlayerPhase } from "@/game/battle/resolver";
import { BattleCtx } from "@/game/effects/context";
import { RunCtx } from "@/game/effects/runCtx";
import { applyDefs } from "@/game/effects/evaluate";
import { injectEffectSource } from "@/game/effects/pipeline";
import { computeCensus } from "@/game/battle/resonance";
import type { NodeType } from "@/game/map/types";
import type { Cond, EffectDef } from "@/game/effects/types";
import type { BattleSnapshot, RolledDie } from "@/types/battle";

const probe = (conds: Cond[]): EffectDef => ({
  on: "turnEnd",
  if: conds,
  do: [{ a: "scrap", n: 1 }],
});

const fires = (
  conds: Cond[],
  snap: BattleSnapshot,
  subject: RolledDie | null = null,
): boolean => {
  const before = snap.scrap;
  const ctx = new BattleCtx(snap, snap.flags);
  applyDefs([probe(conds)], "turnEnd", ctx, subject);
  return snap.scrap > before;
};

describe("grouping", () => {
  it("a bare array is AND", () => {
    const snap = harnessSnap([]);
    expect(fires([{ c: "turnLte", n: 1 }, { c: "shieldAtLeast", n: 0 }], snap)).toBe(
      true,
    );
    expect(fires([{ c: "turnLte", n: 1 }, { c: "shieldAtLeast", n: 5 }], snap)).toBe(
      false,
    );
  });

  it("any is OR over its members", () => {
    const snap = harnessSnap([]);
    expect(
      fires(
        [
          {
            c: "any",
            of: [
              { c: "shieldAtLeast", n: 5 },
              { c: "turnLte", n: 1 },
            ],
          },
        ],
        snap,
      ),
    ).toBe(true);
    expect(
      fires(
        [
          {
            c: "any",
            of: [
              { c: "shieldAtLeast", n: 5 },
              { c: "chargeAtLeast", n: 5 },
            ],
          },
        ],
        snap,
      ),
    ).toBe(false);
  });

  it("not inverts, and nests inside any", () => {
    const snap = harnessSnap([]);
    expect(fires([{ c: "not", of: { c: "shieldAtLeast", n: 5 } }], snap)).toBe(
      true,
    );
    expect(
      fires(
        [
          {
            c: "any",
            of: [
              { c: "chargeAtLeast", n: 5 },
              { c: "not", of: { c: "flag", key: "absent" } },
            ],
          },
        ],
        snap,
      ),
    ).toBe(true);
    expect(
      fires(
        [
          {
            c: "not",
            of: {
              c: "any",
              of: [
                { c: "turnLte", n: 1 },
                { c: "chargeAtLeast", n: 5 },
              ],
            },
          },
        ],
        snap,
      ),
    ).toBe(false);
  });
});

describe("self and run conditions", () => {
  it("chargeAtLeast, shieldAtLeast and tideAtLeast read the snapshot", () => {
    const snap = harnessSnap([], {
      charge: 6,
      shield: 3,
      tide: 1,
      interference: 2,
    });
    expect(fires([{ c: "chargeAtLeast", n: 6 }], snap)).toBe(true);
    expect(fires([{ c: "chargeAtLeast", n: 7 }], snap)).toBe(false);
    expect(fires([{ c: "shieldAtLeast", n: 3 }], snap)).toBe(true);
    expect(fires([{ c: "tideAtLeast", n: 3 }], snap)).toBe(true);
    expect(fires([{ c: "tideAtLeast", n: 4 }], snap)).toBe(false);
  });

  it("flag reads the snapshot flags a run seeded", () => {
    const snap = harnessSnap([], { flags: ["courierFreed"] });
    expect(fires([{ c: "flag", key: "courierFreed" }], snap)).toBe(true);
    expect(fires([{ c: "flag", key: "hunterEngaged" }], snap)).toBe(false);
  });

  it("counterAtLeast reads battle and run scopes separately", () => {
    const snap = harnessSnap([], {
      counters: { kills: 2 },
      runCounters: { beaconsSeen: 3 },
    });
    expect(
      fires([{ c: "counterAtLeast", scope: "battle", key: "kills", n: 2 }], snap),
    ).toBe(true);
    expect(
      fires([{ c: "counterAtLeast", scope: "battle", key: "kills", n: 3 }], snap),
    ).toBe(false);
    expect(
      fires(
        [{ c: "counterAtLeast", scope: "run", key: "beaconsSeen", n: 3 }],
        snap,
      ),
    ).toBe(true);
    expect(
      fires([{ c: "counterAtLeast", scope: "run", key: "kills", n: 1 }], snap),
    ).toBe(false);
  });

  it("firstOfTurn holds only while the turn's first slot resolves", () => {
    const dice = [harnessDie("a", "grey-d4", 3), harnessDie("b", "grey-d4", 3)];
    const snap = harnessSnap(dice);
    place(snap, "a", "weaponA");
    place(snap, "b", "shields");
    const fired: string[] = [];
    const dispose = injectEffectSource({
      key: "first-of-turn-probe",
      run: (hook, ctx, subject) => {
        if (hook !== "beforeResolveSlot") return;
        applyDefs(
          [
            {
              on: "beforeResolveSlot",
              if: [{ c: "firstOfTurn" }],
              do: [{ a: "scrap", n: 1 }],
            },
          ],
          hook,
          ctx,
          subject,
        );
        if (ctx.firstOfTurn?.() === true) fired.push(subject?.uid ?? "none");
      },
    });
    try {
      const { next } = resolvePlayerPhase(snap);
      expect(fired).toEqual(["a"]);
      expect(next.scrap).toBe(1);
    } finally {
      dispose();
    }
  });

  it("firstOfTurn is false outside slot resolution", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 3)]);
    const ctx = new BattleCtx(snap);
    expect(ctx.firstOfTurn()).toBe(false);
    expect(fires([{ c: "firstOfTurn" }], snap)).toBe(false);
  });
});

describe("enemy-state conditions", () => {
  it("enemyHpPctLt reads the current target", () => {
    const snap = harnessSnap([], {
      enemies: [harnessEnemy({ hp: 9, hpMax: 40 })],
    });
    expect(fires([{ c: "enemyHpPctLt", n: 25 }], snap)).toBe(true);
    expect(fires([{ c: "enemyHpPctLt", n: 20 }], snap)).toBe(false);
  });

  it("enemyShielded and enemyHasStatus read the target's state", () => {
    const snap = harnessSnap([], {
      enemies: [harnessEnemy({ shield: 4, statuses: { burn: 2 } })],
    });
    expect(fires([{ c: "enemyShielded" }], snap)).toBe(true);
    expect(fires([{ c: "enemyHasStatus", s: "burn" }], snap)).toBe(true);
    expect(fires([{ c: "enemyHasStatus", s: "jam" }], snap)).toBe(false);
  });

  it("enemyCountAtLeast counts living enemies only", () => {
    const snap = harnessSnap([], {
      enemies: [
        harnessEnemy({ id: "enemy-0" }),
        harnessEnemy({ id: "enemy-1" }),
        harnessEnemy({ id: "enemy-2", hp: 0 }),
      ],
    });
    expect(fires([{ c: "enemyCountAtLeast", n: 2 }], snap)).toBe(true);
    expect(fires([{ c: "enemyCountAtLeast", n: 3 }], snap)).toBe(false);
  });

  it("targetIsBossOrMini reads the enemy definition", () => {
    const plain = harnessSnap([], { enemies: [harnessEnemy()] });
    expect(fires([{ c: "targetIsBossOrMini" }], plain)).toBe(false);
    const boss = harnessSnap([], {
      enemies: [harnessEnemy({ defId: "quarantineWarden" })],
    });
    expect(fires([{ c: "targetIsBossOrMini" }], boss)).toBe(true);
  });
});

describe("run scope", () => {
  const runCtx = (): RunCtx =>
    new RunCtx({
      hull: 12,
      hullMax: 30,
      tide: 2,
      interference: 0,
      flagKeys: ["courierFreed"],
      counters: { shopsVisited: 4 },
      resonance: computeCensus([{ school: "red" }, { school: "red" }]),
      loadout: {
        deckDefIds: ["red-d6", "red-d6"],
        perks: [],
        modules: ["emberInjector"],
      },
    });

  const runFires = (conds: Cond[], ctx: RunCtx): boolean => {
    applyDefs(
      [{ on: "nodeEnter", if: conds, do: [{ a: "scrap", n: 1 }] }],
      "nodeEnter",
      ctx,
      null,
    );
    return ctx.deltas.scrap > 0;
  };

  it("answers hull, flag, counter, tide and resonance out of battle", () => {
    expect(runFires([{ c: "hullPctLt", n: 50 }], runCtx())).toBe(true);
    expect(runFires([{ c: "flag", key: "courierFreed" }], runCtx())).toBe(true);
    expect(
      runFires(
        [{ c: "counterAtLeast", scope: "run", key: "shopsVisited", n: 4 }],
        runCtx(),
      ),
    ).toBe(true);
    expect(runFires([{ c: "tideAtLeast", n: 2 }], runCtx())).toBe(true);
    expect(
      runFires([{ c: "resonanceAtLeast", school: "red", n: 2 }], runCtx()),
    ).toBe(true);
  });

  it("answers nodeIs from the node the run is entering", () => {
    const withNode = (
      node: { nodeType: NodeType; pocket: boolean } | undefined,
    ): RunCtx => {
      const ctx = runCtx();
      ctx.payload =
        node === undefined
          ? {}
          : {
              node: {
                nodeId: "r4l1",
                nodeType: node.nodeType,
                sector: 1,
                row: 4,
                pocket: node.pocket,
              },
            };
      return ctx;
    };
    expect(
      runFires(
        [{ c: "nodeIs", is: "shop" }],
        withNode({ nodeType: "shop", pocket: false }),
      ),
    ).toBe(true);
    expect(
      runFires(
        [{ c: "nodeIs", is: "shop" }],
        withNode({ nodeType: "event", pocket: false }),
      ),
    ).toBe(false);
    expect(
      runFires(
        [{ c: "nodeIs", is: "pocket" }],
        withNode({ nodeType: "battle", pocket: true }),
      ),
    ).toBe(true);
    expect(
      runFires(
        [{ c: "nodeIs", is: "pocket" }],
        withNode({ nodeType: "battle", pocket: false }),
      ),
    ).toBe(false);
    expect(runFires([{ c: "nodeIs", is: "battle" }], withNode(undefined))).toBe(
      false,
    );
  });

  it("battle-only conditions stay false out of battle", () => {
    expect(runFires([{ c: "turnLte", n: 99 }], runCtx())).toBe(false);
    expect(runFires([{ c: "enemyCountAtLeast", n: 1 }], runCtx())).toBe(false);
    expect(runFires([{ c: "slot", is: "weapons" }], runCtx())).toBe(false);
    expect(runFires([{ c: "firstOfTurn" }], runCtx())).toBe(false);
    expect(
      runFires(
        [{ c: "counterAtLeast", scope: "battle", key: "shopsVisited", n: 1 }],
        runCtx(),
      ),
    ).toBe(false);
  });

  it("die conditions need a subject and stay false without one", () => {
    const snap = harnessSnap([harnessDie("a", "grey-d4", 4)]);
    expect(fires([{ c: "isMaxFace" }], snap)).toBe(false);
    expect(fires([{ c: "isMaxFace" }], snap, snap.dice[0] ?? null)).toBe(true);
  });
});

describe("school matching", () => {
  it("prismatic answers any school by default and none when exact", () => {
    const snap = harnessSnap([harnessDie("p", "coreshard", 5)]);
    const prism = snap.dice[0] ?? null;
    expect(fires([{ c: "school", is: "green" }], snap, prism)).toBe(true);
    expect(
      fires([{ c: "school", is: "green", exact: true }], snap, prism),
    ).toBe(false);
  });

  it("exact still matches the die's own school", () => {
    const snap = harnessSnap([harnessDie("g", "green-d4", 4)]);
    const green = snap.dice[0] ?? null;
    expect(
      fires([{ c: "school", is: "green", exact: true }], snap, green),
    ).toBe(true);
  });
});
