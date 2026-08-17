import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ALL_COACH_MARK_IDS } from "@/game/tutorial";
import { abandonRun } from "@/game/run/flow";
import { totalXpForLevel } from "@/game/xp";
import { setClockSource } from "@/services/clock";
import { createTestApi } from "@/services/testApi";
import { useAppStore } from "@/stores/appStore";
import { useBattleStore } from "@/stores/battleStore";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import { useSettingsStore } from "@/stores/settingsStore";

const api = createTestApi();

describe("testApi", () => {
  beforeEach(() => {
    abandonRun();
    useMetaStore.setState({ tutorialSeen: [], shards: 0, xp: 0, level: 1 });
    useAppStore.setState({ screen: "menu", params: undefined, stack: [] });
  });

  afterEach(() => {
    setClockSource(null);
  });

  it("seedRun starts a reproducible campaign on the map", () => {
    api.seedRun({ seed: 1234 });
    const first = api.state();
    expect(first.screen).toBe("map");
    expect(first.run.active).toBe(true);
    expect(first.run.mode).toBe("campaign");
    expect(first.run.seed).toBe(1234);

    abandonRun();
    api.seedRun({ seed: 1234 });
    expect(api.state().run).toEqual(first.run);
  });

  it("seedRun honours mode, ship and deck", () => {
    api.seedRun({
      mode: "drift",
      seed: 5,
      ship: "ram",
      deck: ["ember", "ember", "slug"],
    });
    const state = api.state();
    expect(state.run.mode).toBe("drift");
    expect(state.meta.selectedShip).toBe("ram");
    expect(state.run.deck).toEqual(["ember", "ember", "slug"]);
  });

  it("seedRun can land on the interstitial instead of the map", () => {
    api.seedRun({ seed: 3, land: "interstitial" });
    expect(api.state().screen).toBe("interstitial");
  });

  it("grantMeta moves level, shards and unlock state through store actions", () => {
    api.grantMeta({
      level: 12,
      shards: 400,
      unlocks: ["sectorSix"],
      ships: ["ark"],
      themes: ["ember"],
      codex: ["dossier:raider"],
      achievements: ["firstBlood"],
      collection: [{ defId: "vulture", count: 2 }],
      prologueDone: true,
      tutorialSeen: "all",
    });
    const meta = useMetaStore.getState();
    expect(meta.level).toBe(12);
    expect(meta.xp).toBe(totalXpForLevel(12));
    expect(meta.shards).toBe(400);
    expect(meta.stats.runs).toBe(0);
    expect(meta.unlocksGranted).toContain("sectorSix");
    expect(meta.ships).toContain("ark");
    expect(meta.themes).toContain("ember");
    expect(meta.codex).toContain("dossier:raider");
    expect(meta.achievements).toContain("firstBlood");
    expect(meta.collection.find((e) => e.defId === "vulture")?.count).toBe(2);
    expect(meta.stats.prologueDone).toBe(true);
    expect(meta.tutorialSeen).toEqual([...ALL_COACH_MARK_IDS]);
  });

  it("grantMeta lowers shards as well as raising them", () => {
    api.grantMeta({ shards: 100 });
    api.grantMeta({ shards: 25 });
    expect(useMetaStore.getState().shards).toBe(25);
  });

  it("setBattle injects a reproducible encounter", () => {
    api.seedRun({ seed: 9 });
    api.setBattle({ enemyIds: ["raider"], seed: 42 });
    const first = api.state();
    expect(first.screen).toBe("battle");
    expect(first.battle.phase).toBe("placement");
    expect(first.battle.enemies.map((e) => e.defId)).toEqual(["raider"]);
    expect(first.battle.dice.length).toBeGreaterThan(0);

    api.setBattle({ enemyIds: ["raider"], seed: 42 });
    expect(api.state().battle.dice).toEqual(first.battle.dice);
  });

  it("setBattle restores an exact snapshot when given one", () => {
    api.seedRun({ seed: 9 });
    api.setBattle({ enemyIds: ["raider"], seed: 42 });
    const dice = useBattleStore.getState().dice;
    const first = dice[0];
    if (first === undefined) throw new Error("expected a rolled die");
    useBattleStore.getState().placeDie(first.uid, "weaponA");
    const saved = useBattleStore.getState();
    const snapshot = {
      values: { ...saved },
      streamStates: { map: 1, dice: 2, loot: 3, events: 4, shop: 5, fate: 6, vfx: 7 },
      enemyStreamState: 8,
    };
    useBattleStore.getState().reset();
    api.setBattle({ snapshot: snapshot as never });
    expect(api.state().battle.slots.find((s) => s.id === "weaponA")?.dieUid).toBe(
      first.uid,
    );
  });

  it("skipToNode performs one legal jump and refuses an unreachable node", () => {
    api.seedRun({ seed: 21 });
    const nodes = api.mapNodes();
    const target = nodes.find((node) => node.reachable);
    if (target === undefined) throw new Error("expected a reachable node");
    expect(api.skipToNode(target.id)).toBe(true);
    expect(api.state().run.position).toBe(target.id);

    const far = api
      .mapNodes()
      .find((node) => !node.reachable && !node.visited);
    if (far === undefined) throw new Error("expected an unreachable node");
    expect(api.skipToNode(far.id)).toBe(false);
  });

  it("mapNodes reports visited state and is empty outside a run", () => {
    expect(api.mapNodes()).toEqual([]);
    api.seedRun({ seed: 21 });
    const nodes = api.mapNodes();
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes.filter((node) => node.visited)).toHaveLength(1);
  });

  it("settings writes through the settings store", () => {
    api.settings({ locale: "ru", fontScale: "l", screenShake: false });
    const settings = useSettingsStore.getState();
    expect(settings.locale).toBe("ru");
    expect(settings.fontScale).toBe("l");
    expect(settings.screenShake).toBe(false);
    api.settings({ locale: "en", fontScale: "m", screenShake: true });
  });

  it("now freezes and releases the clock", () => {
    expect(api.now(1_700_000_000_000)).toBe(1_700_000_000_000);
    expect(api.now()).toBe(1_700_000_000_000);
    api.seedRun({ seed: 4 });
    expect(useRunStore.getState().startedAt).toBe(1_700_000_000_000);
    api.now(null);
    expect(api.now()).toBeGreaterThan(1_700_000_000_000);
  });

  it("go navigates through the app store", () => {
    api.go("settings");
    expect(useAppStore.getState().screen).toBe("settings");
    api.go("codex", { tab: "lore" });
    expect(useAppStore.getState().params).toEqual({ tab: "lore" });
  });

  it("anchors is null while no battle scene is mounted", () => {
    expect(api.anchors()).toBeNull();
  });

  it("state mirrors run, battle and meta", () => {
    api.grantMeta({ shards: 60 });
    api.seedRun({ seed: 8 });
    const state = api.state();
    expect(state.meta.shards).toBe(60);
    expect(state.run.hull).toBe(state.run.hullMax);
    expect(state.battle.phase).toBe("idle");
  });

  it("reset drops the active run and returns to the menu", () => {
    api.seedRun({ seed: 8 });
    api.reset();
    expect(useRunStore.getState().active).toBe(false);
    expect(useBattleStore.getState().phase).toBe("idle");
    expect(useAppStore.getState().screen).toBe("menu");
  });
});
