import { beforeEach, describe, expect, it } from "vitest";
import { echoStartCharge } from "@/data/echo";
import {
  FINAL_MEMORY_IDS,
  NUMBERED_MEMORIES,
} from "@/data/narrative/memories";
import { applyOutcome } from "@/game/events/apply";
import {
  abandonRun,
  endRun,
  startEventBattle,
  startRun,
  startRunMode,
} from "@/game/run/flow";
import {
  captureRunSnapshot,
  restoreRunSnapshot,
  RUN_SNAPSHOT_ACCEPTED,
  RUN_SNAPSHOT_V,
} from "@/game/run/snapshot";
import { createStreams } from "@/services/rng";
import { useBattleStore } from "@/stores/battleStore";
import {
  createInitialMetaValues,
  META_VERSION,
  migrateMeta,
  useMetaStore,
} from "@/stores/metaStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";
import type { EchoNodeId } from "@/data/echo";
import type { Outcome } from "@/types/events";

const ALL_FRAGMENTS: readonly string[] = [
  ...NUMBERED_MEMORIES.map((m) => m.codexId),
  ...FINAL_MEMORY_IDS,
];

const bankFragments = (ids: readonly string[] = ALL_FRAGMENTS): void => {
  useMetaStore.setState({ codex: [...ids] });
};

const equip = (id: EchoNodeId | null): void => {
  useMetaStore.getState().selectEcho(id);
};

describe("equipping one node, the chartPicks way", () => {
  beforeEach(() => {
    useMetaStore.setState(createInitialMetaValues());
    abandonRun();
  });

  it("refuses a node the lifetime count has not reached", () => {
    bankFragments(NUMBERED_MEMORIES.slice(0, 3).map((m) => m.codexId));
    equip("veto");
    expect(useMetaStore.getState().selectedEcho).toBeNull();
    equip("secondLook");
    expect(useMetaStore.getState().selectedEcho).toBe("secondLook");
  });

  it("holds exactly one node and swaps rather than stacks", () => {
    bankFragments();
    equip("secondLook");
    equip("veto");
    expect(useMetaStore.getState().selectedEcho).toBe("veto");
    equip(null);
    expect(useMetaStore.getState().selectedEcho).toBeNull();
  });

  it("copies the standing choice into the run at launch", () => {
    bankFragments();
    equip("reserve");
    startRunMode({ mode: "campaign", seed: 21 });
    expect(useRunStore.getState().echo).toBe("reserve");
    expect(useRunStore.getState().echoUsed).toBe(false);
  });

  it("degrades to none when the profile no longer holds the fragments", () => {
    bankFragments();
    equip("veto");
    useMetaStore.setState({ codex: [] });
    startRunMode({ mode: "campaign", seed: 21 });
    expect(useRunStore.getState().echo).toBeNull();
  });

  it("never reaches back into a run already under way", () => {
    bankFragments();
    equip("reserve");
    startRunMode({ mode: "campaign", seed: 21 });
    equip("veto");
    expect(useRunStore.getState().echo).toBe("reserve");
  });
});

describe("the one once-per-run charge", () => {
  beforeEach(() => {
    useMetaStore.setState(createInitialMetaValues());
    abandonRun();
    bankFragments();
    equip("veto");
    startRunMode({ mode: "campaign", seed: 21 });
  });

  it("spends once and refuses every later ask", () => {
    expect(useRunStore.getState().spendEcho()).toBe(true);
    expect(useRunStore.getState().echoUsed).toBe(true);
    expect(useRunStore.getState().spendEcho()).toBe(false);
  });

  it("clears at run start", () => {
    useRunStore.getState().spendEcho();
    startRunMode({ mode: "campaign", seed: 22 });
    expect(useRunStore.getState().echoUsed).toBe(false);
  });

  it("clears at endRun beside the crew and the hold", () => {
    useRunStore.getState().spendEcho();
    endRun(false, "hull");
    expect(useRunStore.getState().echoUsed).toBe(false);
    expect(captureRunSnapshot().run.echoUsed).toBe(false);
  });
});

describe("Power Reserve opens every battle with its charge", () => {
  beforeEach(() => {
    useMetaStore.setState(createInitialMetaValues());
    abandonRun();
  });

  const openingCharge = (echo: EchoNodeId | null): number => {
    startRun(31);
    useRunStore.setState({ echo });
    startEventBattle({ enemyIds: ["scavDrone"] });
    return useBattleStore.getState().charge;
  };

  it("adds exactly the def's charge over an unequipped run", () => {
    const cold = openingCharge(null);
    const warm = openingCharge("reserve");
    expect(warm - cold).toBe(echoStartCharge("reserve"));
    expect(echoStartCharge("reserve")).toBe(2);
  });

  it("adds nothing for a node that is not the reserve", () => {
    const cold = openingCharge(null);
    expect(openingCharge("shieldEcho")).toBe(cold);
  });
});

describe("Veto clamps an event outcome at one hull", () => {
  const lethalOutcome: Outcome = {
    text: "content:events.driftingPod.text",
    effects: [{ k: "hull", n: -40 }],
  };

  beforeEach(() => {
    useMetaStore.setState(createInitialMetaValues());
    abandonRun();
    bankFragments();
  });

  const seat = (echo: EchoNodeId | null): void => {
    useRunStore.getState().hydrate({
      ...createInitialRunValues(),
      active: true,
      hull: 12,
      hullMax: 30,
      echo,
    });
  };

  it("leaves the hull at 1 instead of zero, once", () => {
    seat("veto");
    applyOutcome(lethalOutcome, createStreams(7).events);
    expect(useRunStore.getState().hull).toBe(1);
    expect(useRunStore.getState().echoUsed).toBe(true);
    useRunStore.setState({ hull: 12 });
    applyOutcome(lethalOutcome, createStreams(7).events);
    expect(useRunStore.getState().hull).toBe(0);
  });

  it("lets the hull reach zero with no node equipped", () => {
    seat(null);
    applyOutcome(lethalOutcome, createStreams(7).events);
    expect(useRunStore.getState().hull).toBe(0);
    expect(useRunStore.getState().echoUsed).toBe(false);
  });

  it("does not fire on damage the hull survives", () => {
    seat("veto");
    applyOutcome(
      { text: lethalOutcome.text, effects: [{ k: "hull", n: -4 }] },
      createStreams(7).events,
    );
    expect(useRunStore.getState().hull).toBe(8);
    expect(useRunStore.getState().echoUsed).toBe(false);
  });
});

describe("the two version bumps the equip cost", () => {
  it("moves the run snapshot to v16 and keeps every older blob readable", () => {
    expect(RUN_SNAPSHOT_V).toBe(16);
    expect(RUN_SNAPSHOT_ACCEPTED).toEqual([10, 11, 12, 13, 14, 15, 16]);
  });

  it("round-trips the equipped node and its spent charge", () => {
    useMetaStore.setState(createInitialMetaValues());
    bankFragments();
    equip("softLanding");
    startRunMode({ mode: "campaign", seed: 21 });
    useRunStore.getState().spendEcho();
    const snapshot = captureRunSnapshot();
    expect(snapshot.v).toBe(RUN_SNAPSHOT_V);
    abandonRun();
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    expect(useRunStore.getState().echo).toBe("softLanding");
    expect(useRunStore.getState().echoUsed).toBe(true);
  });

  it("restores a v14 blob that never carried the fields", () => {
    useMetaStore.setState(createInitialMetaValues());
    abandonRun();
    startRunMode({ mode: "campaign", seed: 21 });
    useRunStore.setState({ scrap: 77 });
    const fresh = captureRunSnapshot();
    const { echo, echoUsed, ...legacyRun } = fresh.run;
    expect(echo).toBeNull();
    expect(echoUsed).toBe(false);
    const legacy = {
      ...fresh,
      v: 14,
      run: legacyRun as typeof fresh.run,
    };
    abandonRun();
    expect(restoreRunSnapshot(legacy)).toBe(true);
    expect(useRunStore.getState().echo).toBeNull();
    expect(useRunStore.getState().echoUsed).toBe(false);
    expect(useRunStore.getState().scrap).toBe(77);
  });

  it("moves the meta store to v18 and carries a v17 profile across", () => {
    expect(META_VERSION).toBe(18);
    const migrated = migrateMeta(
      { shards: 250, codex: ["memory-1", "memory-2"], selectedShip: "wanderer" },
      17,
    );
    expect(migrated.shards).toBe(250);
    expect(migrated.codex).toEqual(["memory-1", "memory-2"]);
    expect(migrated.selectedEcho).toBeNull();
  });

  it("keeps a persisted equip and drops one that is not a node any more", () => {
    expect(migrateMeta({ selectedEcho: "veto" }, 17).selectedEcho).toBe("veto");
    expect(migrateMeta({ selectedEcho: "anchor" }, 17).selectedEcho).toBeNull();
    expect(migrateMeta({}, META_VERSION).selectedEcho).toBeNull();
  });
});
