import { describe, expect, it } from "vitest";
import { noteDragTally } from "@/game/meta/counters";
import { dragTally, noteDragCancel, noteDragDrop, takeDragTally } from "@/pixi/battle/dragState";
import { useMetaStore } from "@/stores/metaStore";

describe("the drag tally", () => {
  it("counts drops and cancels until the battle takes them, then starts again from zero", () => {
    takeDragTally();
    noteDragDrop();
    noteDragDrop();
    noteDragCancel();
    expect(dragTally()).toEqual({ drops: 2, cancels: 1 });
    expect(takeDragTally()).toEqual({ drops: 2, cancels: 1 });
    expect(dragTally()).toEqual({ drops: 0, cancels: 0 });
  });

  it("adds a battle's tally to the lifetime counters and writes nothing for an empty one", () => {
    const before = useMetaStore.getState().stats;
    noteDragTally(3, 1);
    const after = useMetaStore.getState().stats;
    expect(after.dragDrops - before.dragDrops).toBe(3);
    expect(after.dragCancels - before.dragCancels).toBe(1);
    noteDragTally(0, 0);
    expect(useMetaStore.getState().stats).toBe(after);
  });
});
