import { beforeEach, describe, expect, it } from "vitest";
import { CABIN_CAP, OFFICER_BY_ID } from "@/data/officers";
import { applyOutcome } from "@/game/events/apply";
import { must, optionById } from "@/game/events/eventFixtures";
import { abandonRun, endRun, startRun } from "@/game/run/flow";
import {
  grantOfficer,
  resolveSwapReplace,
  resolveSwapSell,
  swapValue,
} from "@/game/run/inventory";
import { computeOfficerMods, computeRunMods } from "@/game/run/runMods";
import {
  captureRunSnapshot,
  restoreRunSnapshot,
  RUN_SNAPSHOT_ACCEPTED,
  RUN_SNAPSHOT_V,
} from "@/game/run/snapshot";
import { createStream } from "@/services/rng";
import { useRunStore } from "@/stores/runStore";
import type { Outcome } from "@/types/events";

const rescueOutcome = (officerId: string): Outcome => {
  const def = must(OFFICER_BY_ID.get(officerId), `officer ${officerId}`);
  const option = optionById(def.event, def.option);
  const outcomes = [
    ...(option.outcomes ?? []),
    ...(option.onPass ?? []),
    ...(option.onFail ?? []),
  ];
  return must(
    outcomes.find((out) =>
      out.effects.some((eff) => eff.k === "officer" && eff.id === officerId),
    ),
    `${def.event}.${def.option} grants no officer`,
  );
};

const rescue = (officerId: string): void => {
  applyOutcome(rescueOutcome(officerId), createStream(7));
};

describe("a rescue fills a cabin", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
  });

  it("puts the rescued officer aboard through the event vocabulary", () => {
    expect(useRunStore.getState().officers).toEqual([]);
    rescue("mechanic");
    expect(useRunStore.getState().officers).toEqual(["mechanic"]);
  });

  it("fills both cabins in the order the rescues happened", () => {
    rescue("mechanic");
    rescue("scrapper");
    expect(useRunStore.getState().officers).toEqual(["mechanic", "scrapper"]);
  });

  it("never seats the same officer twice", () => {
    expect(grantOfficer("mechanic")).toBe("added");
    expect(grantOfficer("mechanic")).toBe("owned");
    expect(useRunStore.getState().officers).toEqual(["mechanic"]);
  });

  it("refuses an id the roster does not carry", () => {
    expect(grantOfficer("stowaway")).toBe("owned");
    expect(useRunStore.getState().officers).toEqual([]);
  });
});

describe("a third rescue with both cabins full", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
    rescue("mechanic");
    rescue("scrapper");
  });

  it("asks rather than decides — it queues the card and drops nobody", () => {
    rescue("defector");
    const after = useRunStore.getState();
    expect(after.officers).toEqual(["mechanic", "scrapper"]);
    expect(after.officers).toHaveLength(CABIN_CAP);
    expect(after.pendingSwaps).toEqual([
      { kind: "officer", officerId: "defector" },
    ]);
    expect(swapValue(after.pendingSwaps[0] ?? { kind: "die", defId: "" })).toBe(
      0,
    );
  });

  it("queues one card per rescue rather than collapsing them", () => {
    rescue("defector");
    rescue("welder");
    expect(useRunStore.getState().pendingSwaps).toEqual([
      { kind: "officer", officerId: "defector" },
      { kind: "officer", officerId: "welder" },
    ]);
  });

  it("seats the newcomer in the picked cabin when the card is answered", () => {
    rescue("defector");
    resolveSwapReplace("mechanic");
    const after = useRunStore.getState();
    expect(after.officers).toEqual(["scrapper", "defector"]);
    expect(after.pendingSwaps).toEqual([]);
  });

  it("leaves the newcomer behind, and pays nothing, when the card is refused", () => {
    rescue("defector");
    const scrapBefore = useRunStore.getState().scrap;
    resolveSwapSell();
    const after = useRunStore.getState();
    expect(after.officers).toEqual(["mechanic", "scrapper"]);
    expect(after.scrap).toBe(scrapBefore);
    expect(after.pendingSwaps).toEqual([]);
  });
});

describe("officer passives reach the run's own aggregation", () => {
  beforeEach(() => {
    useRunStore.getState().reset();
  });

  it("sums an aboard officer's mods into computeRunMods", () => {
    expect(computeRunMods([], [], [], []).battleEndHeal).toBe(0);
    expect(computeRunMods([], [], [], ["mechanic"]).battleEndHeal).toBe(1);
    expect(computeRunMods([], [], [], ["scrapper"]).scrapMultPct).toBe(5);
    expect(computeRunMods([], [], [], ["defector"]).markBonusDelta).toBe(1);
    expect(computeRunMods([], [], [], ["welder"]).evasionDelta).toBe(3);
    expect(computeRunMods([], [], [], ["breaker"]).scrapPerKill).toBe(1);
    expect(computeRunMods([], [], [], ["chorister"]).rerollSizeDelta).toBe(1);
  });

  it("stacks both cabins and ignores an unknown id", () => {
    const both = computeOfficerMods(["scrapper", "breaker", "nobody"]);
    expect(both.scrapMultPct).toBe(5);
    expect(both.scrapPerKill).toBe(1);
    expect(computeOfficerMods([]).scrapMultPct).toBe(0);
  });

  it("reads the aboard roster off the live run, not a caller's list", () => {
    rescue("scrapper");
    const s = useRunStore.getState();
    expect(
      computeRunMods(s.perks, s.chartPicks, s.modules, s.officers).scrapMultPct,
    ).toBe(5);
  });
});

describe("the run releases the cabins", () => {
  beforeEach(() => {
    abandonRun();
    startRun(21);
  });

  it("empties both cabins when the run ends", () => {
    grantOfficer("mechanic");
    grantOfficer("scrapper");
    expect(useRunStore.getState().officers).toHaveLength(2);
    endRun(false, "hull");
    expect(useRunStore.getState().officers).toEqual([]);
  });

  it("keeps them out of the snapshot the ending autosaves", () => {
    grantOfficer("mechanic");
    endRun(false, "hull");
    expect(captureRunSnapshot().run.officers).toEqual([]);
  });
});

describe("the crew snapshot", () => {
  beforeEach(() => {
    abandonRun();
    startRun(23);
  });

  it("bumps to v16 and still accepts every version the build has written", () => {
    expect(RUN_SNAPSHOT_V).toBe(16);
    expect(RUN_SNAPSHOT_ACCEPTED).toEqual([10, 11, 12, 13, 14, 15, 16]);
  });

  it("round-trips the aboard roster", () => {
    grantOfficer("breaker");
    grantOfficer("chorister");
    const snapshot = captureRunSnapshot();
    expect(snapshot.v).toBe(RUN_SNAPSHOT_V);
    abandonRun();
    expect(restoreRunSnapshot(snapshot)).toBe(true);
    expect(useRunStore.getState().officers).toEqual(["breaker", "chorister"]);
  });

  it("does not alias the live roster into the snapshot", () => {
    grantOfficer("breaker");
    const snapshot = captureRunSnapshot();
    useRunStore.getState().removeOfficer("breaker");
    expect(snapshot.run.officers).toEqual(["breaker"]);
  });

  it("restores a v13 blob with empty cabins and nothing else disturbed", () => {
    useRunStore.setState({ scrap: 77 });
    const current = captureRunSnapshot();
    const legacy = {
      ...current,
      v: 13,
      run: Object.fromEntries(
        Object.entries(current.run).filter(([key]) => key !== "officers"),
      ),
    };
    abandonRun();
    expect(restoreRunSnapshot(legacy)).toBe(true);
    const after = useRunStore.getState();
    expect(after.officers).toEqual([]);
    expect(after.scrap).toBe(77);
    expect(after.seed).toBe(current.run.seed);
    expect(after.deck.map((d) => d.defId)).toEqual(
      current.run.deck.map((d) => d.defId),
    );
  });
});
