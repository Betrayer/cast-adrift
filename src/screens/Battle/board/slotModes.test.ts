import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { STARTER_DECK } from "@/data/decks";
import { FIRE_MODES } from "@/data/fireModes";
import {
  fireModeVars,
  slotModeModel,
  slotModeModels,
} from "@/screens/Battle/board/slotModes";
import { createStreams } from "@/services/rng";
import {
  createInitialBattleValues,
  useBattleStore,
} from "@/stores/battleStore";
import { useRunStore } from "@/stores/runStore";

const start = (
  modules: readonly string[] = ["autoloader"],
  enemyIds: string[] = ["raider"],
) => {
  useBattleStore
    .getState()
    .startBattle({ enemyIds, modules }, STARTER_DECK, createStreams(42));
  return useBattleStore.getState();
};

beforeEach(() => {
  useBattleStore.setState(useBattleStore.getInitialState(), true);
  useBattleStore.setState(createInitialBattleValues());
});

afterEach(() => {
  useRunStore.getState().resetMk();
});

describe("slotModeModel", () => {
  it("has no model for a slot that only knows direct fire", () => {
    const board = start();
    expect(slotModeModel(board, "shields")).toBeUndefined();
    expect(slotModeModel(board, "reactor")).toBeUndefined();
  });

  it("has no model on a bare Mk1 weapon slot with no modules", () => {
    const board = start([]);
    expect(board.slots.weaponA?.modes).toBeUndefined();
    expect(slotModeModel(board, "weaponA")).toBeUndefined();
    expect(slotModeModels(board)).toEqual({});
  });

  it("lists every carried mode and marks the armed one", () => {
    start();
    useBattleStore.getState().setSlotMode("weaponA", "doublet");
    const model = slotModeModel(useBattleStore.getState(), "weaponA");
    expect(model?.armed).toBe("doublet");
    expect(model?.options.map((o) => o.id)).toEqual(["direct", "doublet"]);
    expect(model?.options.map((o) => o.armed)).toEqual([false, true]);
    expect(model?.options.every((o) => o.block === null)).toBe(true);
  });

  it("keeps a blocked mode on the list and names its reason", () => {
    useRunStore.getState().setMk("weaponA", 3);
    const board = start([], ["raider"]);
    const model = slotModeModel(board, "weaponA");
    expect(model?.options.map((o) => o.block)).toEqual([
      null,
      "needsTwoEnemies",
    ]);
  });

  it("clears the block once a second enemy is alive", () => {
    useRunStore.getState().setMk("weaponA", 3);
    const board = start([], ["raider", "raider"]);
    const model = slotModeModel(board, "weaponA");
    expect(model?.options.map((o) => o.block)).toEqual([null, null]);
  });

  it("models both weapon slots and nothing else", () => {
    useRunStore.getState().setMk("weaponA", 3);
    const board = start(["autoloader", "piercer"], ["raider", "raider"]);
    expect(Object.keys(slotModeModels(board)).sort()).toEqual([
      "weaponA",
      "weaponB",
    ]);
    expect(slotModeModels(board).weaponA?.options.map((o) => o.id)).toEqual([
      "direct",
      "scatter",
      "doublet",
      "shaped",
    ]);
  });
});

describe("fireModeVars", () => {
  it("names every placeholder its description interpolates", () => {
    const bundle = JSON.parse(
      readFileSync(join("src", "i18n", "en", "content.json"), "utf8"),
    ) as { fireModes: Record<string, { desc: string }> };
    for (const def of FIRE_MODES) {
      const desc = bundle.fireModes[def.id]?.desc ?? "";
      const wanted = [...desc.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]);
      const vars = fireModeVars(def);
      for (const name of wanted) {
        expect(vars[name ?? ""]).toBeTypeOf("number");
      }
    }
  });
});

const read = (path: string): string => readFileSync(path, "utf8");

const SLOT_RENDERER_HOSTS = [
  join("src", "screens", "Battle", "board", "SlotGrid.tsx"),
  join("src", "screens", "Battle", "layouts", "tablet", "TabletLayout.tsx"),
  join("src", "screens", "Battle", "layouts", "orbit", "OrbitLayout.tsx"),
];

describe("SlotModeBadge reach", () => {
  it("renders in all three battle layouts", () => {
    for (const host of SLOT_RENDERER_HOSTS) {
      expect(read(host)).toContain("<SlotModeBadge");
    }
  });

  it("has no battle host that draws a slot without it", () => {
    const hosts = SLOT_RENDERER_HOSTS.map((path) => read(path));
    for (const source of hosts) {
      const draws =
        source.includes("<SlotCard") ||
        source.includes("<SlotRow") ||
        source.includes("<SlotPod") ||
        source.includes("<SlotGrid");
      expect(draws).toBe(true);
    }
  });

  it("stays out of the settings layout preview", () => {
    const preview = read(
      join("src", "screens", "Settings", "LayoutPreview.tsx"),
    );
    expect(preview).toContain("<SlotCard");
    expect(preview).toContain("<SlotRow");
    expect(preview).toContain("<SlotPod");
    expect(preview).not.toContain("SlotModeBadge");
  });
});
