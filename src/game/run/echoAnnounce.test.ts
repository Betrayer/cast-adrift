import { beforeEach, describe, expect, it } from "vitest";
import {
  FINAL_MEMORY_BY_ENDING,
  NUMBERED_MEMORIES,
} from "@/data/narrative/memories";
import { chooseEnding, unlockNextMemory } from "@/game/run/flow";
import {
  createInitialMetaValues,
  useMetaStore,
} from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { createInitialRunValues, useRunStore } from "@/stores/runStore";

const feedKeys = (): string[] =>
  useNarrativeStore
    .getState()
    .feed.filter((m) => m.source === "consequence")
    .map((m) => m.key);

const seat = (gateKills: number): void => {
  useRunStore.getState().hydrate({
    ...createInitialRunValues(),
    active: true,
    hull: 30,
    hullMax: 30,
    stats: { ...createInitialRunValues().stats, minibosses: gateKills },
  });
};

describe("a newly opened node speaks in the feed", () => {
  beforeEach(() => {
    useMetaStore.setState(createInitialMetaValues());
    useNarrativeStore.getState().reset();
  });

  it("announces every node the fragment count crossed, once", () => {
    seat(2);
    unlockNextMemory();
    expect(feedKeys()).toEqual(["run:echo.opened.secondLook"]);
  });

  it("says nothing when the same fragments are replayed on a later run", () => {
    seat(2);
    unlockNextMemory();
    expect(feedKeys()).toHaveLength(1);

    useNarrativeStore.getState().reset();
    seat(2);
    unlockNextMemory();
    expect(feedKeys()).toEqual([]);
  });

  it("names both nodes when one node boundary carries two thresholds", () => {
    seat(4);
    unlockNextMemory();
    expect([...feedKeys()].sort()).toEqual([
      "run:echo.opened.echolocation",
      "run:echo.opened.secondLook",
    ]);
  });

  it("stays quiet on a gate that opens no node", () => {
    seat(2);
    unlockNextMemory();
    useNarrativeStore.getState().reset();
    seat(3);
    unlockNextMemory();
    expect(feedKeys()).toEqual([]);
  });
});

describe("the sixteenth fragment", () => {
  beforeEach(() => {
    useMetaStore.setState(createInitialMetaValues());
    useNarrativeStore.getState().reset();
    seat(0);
  });

  it("announces the node the sealed fragment opens", () => {
    useMetaStore.setState({
      codex: NUMBERED_MEMORIES.map((m) => m.codexId),
    });
    chooseEnding("seal");
    expect(feedKeys()).toEqual(["run:echo.opened.veto"]);
  });

  it("announces whichever node a shorter arc crosses at the ending", () => {
    useMetaStore.setState({
      codex: NUMBERED_MEMORIES.slice(0, 13).map((m) => m.codexId),
    });
    chooseEnding("bargain");
    expect(feedKeys()).toEqual(["run:echo.opened.calculus"]);
  });

  it("stays quiet when a later clear seals a second ending", () => {
    useMetaStore.setState({
      codex: [
        ...NUMBERED_MEMORIES.map((m) => m.codexId),
        FINAL_MEMORY_BY_ENDING.seal ?? "",
      ],
    });
    chooseEnding("merge");
    expect(feedKeys()).toEqual([]);
  });
});
