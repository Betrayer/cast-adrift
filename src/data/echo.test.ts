import { describe, expect, it } from "vitest";
import {
  ECHO_BRANCHES,
  ECHO_NODES,
  ECHO_NODE_IDS,
  echoConditionValues,
  echoEquipped,
  echoNodesCrossed,
  echoNodesOfBranch,
  echoPreviewRows,
  echoRevealRows,
  echoShieldCharge,
  echoSoftLands,
  echoStartCharge,
  echoStepReadout,
  echoUnlockedIds,
  echoVetoHull,
  isEchoNodeId,
} from "@/data/echo";
import {
  FINAL_MEMORY_IDS,
  MEMORY_CODEX_IDS,
  MEMORY_TOTAL,
  memoryFragmentCount,
  NUMBERED_MEMORIES,
} from "@/data/narrative/memories";
import type { PatternStep, StepCond } from "@/types/content";

const THRESHOLDS: Readonly<Record<string, number>> = {
  secondLook: 2,
  echolocation: 4,
  reserve: 6,
  readout: 8,
  pathGhost: 10,
  shieldEcho: 12,
  calculus: 14,
  softLanding: 15,
  veto: 16,
};

describe("the Echo core ladder", () => {
  it("is nine nodes across three branches, three to a branch", () => {
    expect(ECHO_NODES).toHaveLength(9);
    expect(new Set(ECHO_NODE_IDS).size).toBe(9);
    for (const branch of ECHO_BRANCHES) {
      expect(echoNodesOfBranch(branch)).toHaveLength(3);
    }
  });

  it("gates every node on the threshold DESIGN 12.9 states", () => {
    for (const def of ECHO_NODES) {
      expect({ id: def.id, threshold: def.threshold }).toEqual({
        id: def.id,
        threshold: THRESHOLDS[def.id],
      });
    }
    expect([...ECHO_NODES].map((def) => def.threshold).sort((a, b) => a - b)).toEqual([
      2, 4, 6, 8, 10, 12, 14, 15, 16,
    ]);
  });

  it("opens exactly the nodes the fragment count has reached", () => {
    expect(echoUnlockedIds(0)).toEqual([]);
    expect(echoUnlockedIds(1)).toEqual([]);
    expect(echoUnlockedIds(2)).toEqual(["secondLook"]);
    expect(echoUnlockedIds(6)).toEqual([
      "secondLook",
      "echolocation",
      "reserve",
    ]);
    expect(echoUnlockedIds(14)).toEqual([
      "secondLook",
      "readout",
      "calculus",
      "echolocation",
      "pathGhost",
      "reserve",
      "shieldEcho",
    ]);
    expect(echoUnlockedIds(15)).toContain("softLanding");
    expect(echoUnlockedIds(15)).not.toContain("veto");
    expect(echoUnlockedIds(MEMORY_TOTAL)).toHaveLength(9);
  });

  it("names the nodes a fragment crossed, and only those", () => {
    expect(echoNodesCrossed(1, 2).map((def) => def.id)).toEqual(["secondLook"]);
    expect(echoNodesCrossed(2, 2)).toEqual([]);
    expect(echoNodesCrossed(13, 16).map((def) => def.id)).toEqual([
      "calculus",
      "softLanding",
      "veto",
    ]);
  });

  it("refuses to equip a node the count has not reached", () => {
    expect(echoEquipped("veto", 15)).toBeNull();
    expect(echoEquipped("veto", 16)).toBe("veto");
    expect(echoEquipped("secondLook", 2)).toBe("secondLook");
    expect(echoEquipped("notANode", 16)).toBeNull();
    expect(echoEquipped(null, 16)).toBeNull();
    expect(isEchoNodeId("softLanding")).toBe(true);
    expect(isEchoNodeId("anchor")).toBe(false);
  });
});

describe("each node's arithmetic sits on its def", () => {
  it("reads back exactly what 12.9 implies, and zero for every other node", () => {
    expect(echoRevealRows("echolocation")).toBe(1);
    expect(echoRevealRows("pathGhost")).toBe(0);
    expect(echoPreviewRows("pathGhost")).toBe(1);
    expect(echoPreviewRows("echolocation")).toBe(0);
    expect(echoStartCharge("reserve")).toBe(2);
    expect(echoStartCharge("shieldEcho")).toBe(0);
    expect(echoShieldCharge("shieldEcho")).toBe(1);
    expect(echoShieldCharge("reserve")).toBe(0);
    expect(echoVetoHull("veto")).toBe(1);
    expect(echoVetoHull("softLanding")).toBe(0);
    expect(echoSoftLands("softLanding")).toBe(true);
    expect(echoSoftLands("veto")).toBe(false);
    expect(echoRevealRows(null)).toBe(0);
    expect(echoStartCharge(undefined)).toBe(0);
  });
});

describe("the readout node's fork copy", () => {
  const forked = (when: StepCond): PatternStep => ({
    when,
    then: { t: "attack", n: 4 },
    else: { t: "shield", n: 3 },
  });

  it("names the condition and both answers for a branching step", () => {
    const readout = echoStepReadout(forked({ c: "playerShielded" }));
    expect(readout).toEqual({
      cond: "content:echo.cond.playerShielded",
      values: {},
      then: { t: "attack", n: 4 },
      else: { t: "shield", n: 3 },
    });
  });

  it("carries the number for every condition that has one", () => {
    expect(echoConditionValues({ c: "selfHpPctLt", n: 40 })).toEqual({ n: 40 });
    expect(echoConditionValues({ c: "turnGte", n: 3 })).toEqual({ n: 3 });
    expect(echoConditionValues({ c: "selfShielded" })).toEqual({});
  });

  it("says nothing about a step that does not fork", () => {
    expect(echoStepReadout({ t: "attack", n: 5 })).toBeNull();
    expect(
      echoStepReadout({ pick: [[{ t: "attack", n: 5 }, 1]] }),
    ).toBeNull();
  });
});

describe("the lifetime fragment count is derived, not stored", () => {
  it("collapses the five ending finals to one and caps at sixteen", () => {
    expect(MEMORY_CODEX_IDS).toHaveLength(20);
    expect(FINAL_MEMORY_IDS).toHaveLength(5);
    expect(memoryFragmentCount(MEMORY_CODEX_IDS)).toBe(MEMORY_TOTAL);
    expect(memoryFragmentCount([...MEMORY_CODEX_IDS])).toBeLessThan(
      MEMORY_CODEX_IDS.length,
    );
  });

  it("counts a completionist profile at sixteen, not twenty", () => {
    const completionist = [
      ...NUMBERED_MEMORIES.map((m) => m.codexId),
      ...FINAL_MEMORY_IDS,
      "world-drift",
      "dossier-scavDrone",
    ];
    expect(memoryFragmentCount(completionist)).toBe(16);
    expect(echoUnlockedIds(memoryFragmentCount(completionist))).toHaveLength(9);
  });

  it("counts one clear at fifteen when a single ending has been sealed", () => {
    const oneClear = [
      ...NUMBERED_MEMORIES.map((m) => m.codexId),
      "memory-16-seal",
    ];
    expect(memoryFragmentCount(oneClear)).toBe(16);
    const beforeFinale = NUMBERED_MEMORIES.map((m) => m.codexId);
    expect(memoryFragmentCount(beforeFinale)).toBe(15);
    expect(echoUnlockedIds(15)).toHaveLength(8);
  });

  it("ignores codex ids that are not memories at all", () => {
    expect(memoryFragmentCount(["world-drift", "dossier-scavDrone"])).toBe(0);
    expect(memoryFragmentCount([])).toBe(0);
  });
});
