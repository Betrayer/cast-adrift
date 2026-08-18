import { beforeEach, describe, expect, it } from "vitest";
import { ALL_COACH_MARK_IDS, nextCoachMark } from "@/game/tutorial";
import { DEFAULT_SHAPE } from "@/game/map/types";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";
import type { CheckStep, RolledDie } from "@/types/battle";

const step = (moves: CheckStep["moves"]): CheckStep => ({
  id: "s",
  moves,
  fixedRoll: null,
  sayKey: "content:check.free.say",
  failKey: null,
});

const die = (uid: string, state: RolledDie["state"]): RolledDie => ({
  uid,
  defId: "red-d6",
  tier: 6,
  school: "red",
  value: 3,
  state,
});

const placement = (over: Partial<{
  dice: RolledDie[];
  charge: number;
  rerollsLeft: number;
}>): void => {
  useBattleStore.setState({
    phase: "placement",
    introPending: false,
    checkSteps: null,
    checkIndex: 0,
    dice: over.dice ?? [die("a", "tray")],
    charge: over.charge ?? 0,
    rerollsLeft: over.rerollsLeft ?? 0,
  });
};

const seenExcept = (id: string): string[] =>
  ALL_COACH_MARK_IDS.filter((mark) => mark !== id);

describe("coach mark gating", () => {
  beforeEach(() => {
    useBattleStore.setState({
      phase: "idle",
      introPending: false,
      checkSteps: null,
      checkIndex: 0,
      dice: [],
      charge: 0,
      rerollsLeft: 0,
    });
    useRunStore.setState({ map: null });
  });

  it("offers the drag hint first on a fresh battle", () => {
    placement({});
    expect(nextCoachMark("battle", [])?.id).toBe("place");
  });

  it("stays silent while the boss intro card is up", () => {
    placement({});
    useBattleStore.setState({ introPending: true });
    expect(nextCoachMark("battle", [])).toBeNull();
  });

  it("stays out of the systems check while a step restricts the board", () => {
    placement({});
    useBattleStore.setState({
      checkSteps: [step([{ uid: "a", slot: "engines" }]), step(null)],
      checkIndex: 0,
    });
    expect(nextCoachMark("battle", [])).toBeNull();
  });

  it("releases the marks on the check's free turn", () => {
    placement({});
    useBattleStore.setState({
      checkSteps: [step([{ uid: "a", slot: "engines" }]), step(null)],
      checkIndex: 1,
    });
    expect(nextCoachMark("battle", [])?.id).toBe("place");
  });

  it("moves to end-turn once a die sits in a slot", () => {
    placement({ dice: [die("a", "placed")] });
    expect(nextCoachMark("battle", ["place"])?.id).toBe("endTurn");
  });

  it("surfaces the reroll hint only when a reroll is available", () => {
    placement({ dice: [die("a", "tray")] });
    expect(nextCoachMark("battle", seenExcept("reroll"))).toBeNull();
    placement({ dice: [die("a", "tray")], rerollsLeft: 1 });
    expect(nextCoachMark("battle", seenExcept("reroll"))?.id).toBe("reroll");
  });

  it("surfaces the nudge hint once charge can pay for it", () => {
    const seen = seenExcept("nudge");
    placement({ charge: 2 });
    expect(nextCoachMark("battle", seen)).toBeNull();
    placement({ charge: 3 });
    expect(nextCoachMark("battle", seen)?.id).toBe("nudge");
  });

  it("offers the reserve hint whenever the tray has a die to hold", () => {
    const seen = seenExcept("reserve");
    placement({ dice: [die("a", "tray")] });
    expect(nextCoachMark("battle", seen)?.id).toBe("reserve");
    placement({ dice: [die("a", "placed")] });
    expect(nextCoachMark("battle", seen)).toBeNull();
  });

  it("keeps every new mark silent while a check step restricts the board", () => {
    placement({ dice: [die("a", "tray")], charge: 9, rerollsLeft: 2 });
    useBattleStore.setState({
      checkSteps: [step([{ uid: "a", slot: "engines" }]), step(null)],
      checkIndex: 0,
    });
    for (const id of ALL_COACH_MARK_IDS) {
      expect(nextCoachMark("battle", seenExcept(id))).toBeNull();
    }
  });

  it("never repeats a mark that has been seen", () => {
    placement({ dice: [die("a", "tray")], charge: 9, rerollsLeft: 2 });
    expect(nextCoachMark("battle", ALL_COACH_MARK_IDS)).toBeNull();
  });

  it("keeps battle marks off the map screen and vice versa", () => {
    placement({});
    expect(nextCoachMark("map", [])).toBeNull();
    useRunStore.setState({
      map: { nodes: [], edges: [], shape: DEFAULT_SHAPE, edgeMarks: {} },
    });
    expect(nextCoachMark("map", [])?.id).toBe("jump");
    expect(nextCoachMark("battle", [])?.id).toBe("place");
  });

  it("declares the coach marks the tutorial ships, in priority order", () => {
    expect(ALL_COACH_MARK_IDS).toEqual([
      "place",
      "endTurn",
      "reroll",
      "nudge",
      "targeting",
      "reserve",
      "actives",
      "resonance",
      "affinity",
      "prismatic",
      "fate",
      "jump",
    ]);
  });
});
