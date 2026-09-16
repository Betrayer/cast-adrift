import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const autosaveRun = vi.fn();

vi.mock("@/game/run/flow", () => ({ autosaveRun }));
vi.mock("@/game/run/cloud", () => ({ pushRunCloud: vi.fn() }));

const { cancelAutosave, setupAutosave } = await import("@/game/run/autosave");
const { useBattleStore } = await import("@/stores/battleStore");
const { useRunStore } = await import("@/stores/runStore");

describe("the battle autosave debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    autosaveRun.mockClear();
    useRunStore.setState({ active: true });
    setupAutosave();
  });

  afterEach(() => {
    cancelAutosave();
    vi.useRealTimers();
    useRunStore.getState().reset();
  });

  it("writes once after the board settles", () => {
    useBattleStore.setState({ turn: 2 });
    expect(autosaveRun).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1200);
    expect(autosaveRun).toHaveBeenCalledTimes(1);
  });

  it("writes nothing after the pending save is cancelled", () => {
    useBattleStore.setState({ turn: 3 });
    cancelAutosave();
    vi.advanceTimersByTime(5000);
    expect(autosaveRun).not.toHaveBeenCalled();
  });
});
