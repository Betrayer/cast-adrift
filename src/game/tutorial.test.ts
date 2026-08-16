import { beforeEach, describe, expect, it } from "vitest";
import { ALL_COACH_MARK_IDS, nextCoachMark } from "@/game/tutorial";
import { DEFAULT_SHAPE } from "@/game/map/types";
import { useBattleStore } from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";
import type { RolledDie } from "@/types/battle";

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
    scriptedSlots: null,
    dice: over.dice ?? [die("a", "tray")],
    charge: over.charge ?? 0,
    rerollsLeft: over.rerollsLeft ?? 0,
  });
};

describe("coach mark gating", () => {
  beforeEach(() => {
    useBattleStore.setState({
      phase: "idle",
      introPending: false,
      scriptedSlots: null,
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

  it("stays out of the prologue's scripted battle", () => {
    placement({});
    useBattleStore.setState({ scriptedSlots: [["weaponA"], ["shields"]] });
    expect(nextCoachMark("battle", [])).toBeNull();
  });

  it("moves to end-turn once a die sits in a slot", () => {
    placement({ dice: [die("a", "placed")] });
    expect(nextCoachMark("battle", ["place"])?.id).toBe("endTurn");
  });

  it("surfaces the reroll hint only when a reroll is available", () => {
    placement({ dice: [die("a", "tray")] });
    expect(nextCoachMark("battle", ["place", "endTurn"])).toBeNull();
    placement({ dice: [die("a", "tray")], rerollsLeft: 1 });
    expect(nextCoachMark("battle", ["place", "endTurn"])?.id).toBe("reroll");
  });

  it("surfaces the nudge hint at three charge", () => {
    const seen = ["place", "endTurn", "reroll"];
    placement({ charge: 2 });
    expect(nextCoachMark("battle", seen)).toBeNull();
    placement({ charge: 3 });
    expect(nextCoachMark("battle", seen)?.id).toBe("nudge");
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

  it("declares exactly the five coach marks the tutorial ships", () => {
    expect(ALL_COACH_MARK_IDS).toEqual([
      "place",
      "endTurn",
      "reroll",
      "nudge",
      "jump",
    ]);
  });
});
