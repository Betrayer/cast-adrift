import type { ShipId } from "@/data/ships";
import { canPlaceDie } from "@/game/battle/setup";
import { ALL_COACH_MARK_IDS } from "@/game/tutorial";
import type { NodeId } from "@/game/map/types";
import { discardActiveRun, jumpTo, startRunMode } from "@/game/run/flow";
import { totalXpForLevel } from "@/game/xp";
import { now as clockNow, setClockSource } from "@/services/clock";
import { createStreams } from "@/services/rng";
import { clearRun } from "@/services/save";
import { useAppStore } from "@/stores/appStore";
import {
  battleSnapshot,
  hydrateBattle,
  useBattleStore,
  type BattleSaveState,
} from "@/stores/battleStore";
import { useMetaStore, type MetaStats } from "@/stores/metaStore";
import { useRunStore, type RunMode } from "@/stores/runStore";
import { useSettingsStore, type SettingsValues } from "@/stores/settingsStore";
import { battleAnchors, type BattleAnchors } from "@/pixi/battle/anchors";
import type { ScreenId } from "@/types";
import type { SlotId } from "@/types/battle";

export interface SeedRunConfig {
  mode?: RunMode;
  seed?: number;
  ascension?: number;
  contractId?: string | null;
  dailyDate?: string | null;
  mutators?: readonly string[];
  ship?: ShipId;
  deck?: readonly string[];
  land?: "interstitial" | "map";
  node?: NodeId;
}

export interface MetaPatch {
  level?: number;
  shards?: number;
  unlocks?: readonly string[];
  ships?: readonly ShipId[];
  selectedShip?: ShipId;
  themes?: readonly string[];
  deck?: readonly string[];
  chartPicks?: readonly string[];
  collection?: readonly { defId: string; count?: number }[];
  codex?: readonly string[];
  achievements?: readonly string[];
  prologueDone?: boolean;
  tutorialSeen?: "all" | readonly string[];
  stats?: Partial<MetaStats>;
}

export interface RunPatch {
  scrap?: number;
  hull?: number;
  vouchers?: number;
  dice?: readonly string[];
  perks?: readonly string[];
  modules?: readonly string[];
  flags?: readonly string[];
}

export interface BattlePatch {
  enemyIds?: readonly string[];
  deck?: readonly string[];
  shipId?: ShipId;
  seed?: number;
  hull?: number;
  hullMax?: number;
  tide?: number;
  interference?: number;
  perks?: readonly string[];
  modules?: readonly string[];
  chargeCap?: number;
  startCharge?: number;
  ascension?: number;
  snapshot?: BattleSaveState;
}

export interface MapNodeView {
  id: NodeId;
  type: string;
  row: number;
  visited: boolean;
  reachable: boolean;
}

export interface DieView {
  uid: string;
  defId: string;
  school: string;
  value: number;
  tier: number;
  state: string;
  slot: SlotId | null;
}

export interface TestState {
  screen: ScreenId;
  params: Record<string, string> | null;
  uid: string | null;
  run: {
    active: boolean;
    mode: RunMode;
    seed: number;
    sector: number;
    position: NodeId | null;
    hull: number;
    hullMax: number;
    scrap: number;
    deck: string[];
    visited: NodeId[];
  };
  battle: {
    phase: string;
    turn: number;
    hull: number;
    charge: number;
    outcome: string | null;
    selectedDieUid: string | null;
    dice: DieView[];
    slots: { id: SlotId; dieUid: string | null }[];
    enemies: { id: string; defId: string; hp: number; hpMax: number }[];
  };
  meta: {
    level: number;
    xp: number;
    shards: number;
    selectedShip: ShipId;
  };
}

export interface TestApi {
  seedRun: (config?: SeedRunConfig) => void;
  grantMeta: (patch: MetaPatch) => void;
  grantRun: (patch: RunPatch) => void;
  setBattle: (patch: BattlePatch) => void;
  skipToNode: (nodeId: NodeId) => boolean;
  settings: (patch: Partial<SettingsValues>) => void;
  now: (at?: number | null) => number;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  mapNodes: () => MapNodeView[];
  slotsFor: (uid: string) => SlotId[];
  anchors: () => BattleAnchors | null;
  state: () => TestState;
  reset: () => void;
}

export const TEST_API_MARKER = "ca-test-api";

const STARTER_ENEMY = "raider";
const DEFAULT_SEED = 7;

const applyMeta = (patch: MetaPatch): void => {
  const meta = useMetaStore.getState();
  for (const id of patch.ships ?? []) meta.buyShip(id, 0);
  if (patch.selectedShip !== undefined) {
    meta.buyShip(patch.selectedShip, 0);
    meta.selectShip(patch.selectedShip);
  }
  if (patch.shards !== undefined) {
    const delta = patch.shards - useMetaStore.getState().shards;
    if (delta > 0) meta.addShards(delta);
    else if (delta < 0) meta.spendShards(-delta);
  }
  if (patch.level !== undefined) {
    const target = totalXpForLevel(patch.level);
    const delta = target - useMetaStore.getState().xp;
    if (delta > 0) {
      meta.awardRun(delta, 0, false);
      meta.bumpLifetime({ runs: -1 });
    }
  }
  for (const id of patch.unlocks ?? []) meta.grantUnlock(id);
  for (const id of patch.themes ?? []) meta.unlockTheme(id);
  for (const id of patch.chartPicks ?? []) meta.allocatePick(id);
  for (const id of patch.codex ?? []) meta.unlockCodex(id);
  for (const id of patch.achievements ?? []) meta.unlockAchievement(id);
  for (const entry of patch.collection ?? []) {
    meta.addToCollection(entry.defId, entry.count ?? 1);
  }
  if (patch.deck !== undefined) meta.setDeck(patch.deck);
  if (patch.prologueDone === true) meta.markPrologueDone();
  if (patch.tutorialSeen !== undefined) {
    const ids =
      patch.tutorialSeen === "all" ? ALL_COACH_MARK_IDS : patch.tutorialSeen;
    for (const id of ids) meta.markTutorialSeen(id);
  }
  if (patch.stats !== undefined) meta.bumpLifetime(patch.stats);
};

const applyRun = (patch: RunPatch): void => {
  const run = useRunStore.getState();
  if (patch.scrap !== undefined) {
    const delta = patch.scrap - useRunStore.getState().scrap;
    if (delta > 0) run.addScrap(delta);
    else if (delta < 0) run.spendScrap(-delta);
  }
  if (patch.hull !== undefined) run.setHull(patch.hull);
  if (patch.vouchers !== undefined) run.addVoucher(patch.vouchers);
  for (const defId of patch.dice ?? []) run.addDie(defId);
  for (const id of patch.perks ?? []) run.addPerk(id);
  for (const id of patch.modules ?? []) run.addModule(id);
  for (const key of patch.flags ?? []) run.setFlag(key);
};

const applySettings = (patch: Partial<SettingsValues>): void => {
  const settings = useSettingsStore.getState();
  if (patch.locale !== undefined) settings.setLocale(patch.locale);
  if (patch.sfxVol !== undefined) settings.setSfxVol(patch.sfxVol);
  if (patch.musicVol !== undefined) settings.setMusicVol(patch.musicVol);
  if (patch.reducedMotion !== undefined) {
    settings.setReducedMotion(patch.reducedMotion);
  }
  if (patch.echoVerbosity !== undefined) {
    settings.setEchoVerbosity(patch.echoVerbosity);
  }
  if (patch.screenShake !== undefined) settings.setScreenShake(patch.screenShake);
  if (patch.theme !== undefined) settings.setTheme(patch.theme);
  if (patch.fontScale !== undefined) settings.setFontScale(patch.fontScale);
  if (patch.battleSpeed !== undefined) settings.setBattleSpeed(patch.battleSpeed);
};

const readState = (): TestState => {
  const app = useAppStore.getState();
  const run = useRunStore.getState();
  const battle = useBattleStore.getState();
  const meta = useMetaStore.getState();
  return {
    screen: app.screen,
    params: app.params ?? null,
    uid: app.uid,
    run: {
      active: run.active,
      mode: run.mode,
      seed: run.seed,
      sector: run.sector,
      position: run.position,
      hull: run.hull,
      hullMax: run.hullMax,
      scrap: run.scrap,
      deck: run.deck.map((d) => d.defId),
      visited: [...run.visited],
    },
    battle: {
      phase: battle.phase,
      turn: battle.turn,
      hull: battle.hull,
      charge: battle.charge,
      outcome: battle.outcome ?? null,
      selectedDieUid: battle.selectedDieUid,
      dice: battle.dice.map((d) => ({
        uid: d.uid,
        defId: d.defId,
        school: d.school,
        value: d.value,
        tier: d.tier,
        state: d.state,
        slot: d.slot ?? null,
      })),
      slots: Object.entries(battle.slots).map(([id, slot]) => ({
        id: id as SlotId,
        dieUid: slot?.dieUid ?? null,
      })),
      enemies: battle.enemies.map((e) => ({
        id: e.id,
        defId: e.defId,
        hp: e.hp,
        hpMax: e.hpMax,
      })),
    },
    meta: {
      level: meta.level,
      xp: meta.xp,
      shards: meta.shards,
      selectedShip: meta.selectedShip,
    },
  };
};

export const createTestApi = (): TestApi => ({
  seedRun: (config = {}) => {
    const meta = useMetaStore.getState();
    if (config.ship !== undefined) {
      meta.buyShip(config.ship, 0);
      meta.selectShip(config.ship);
    }
    if (config.deck !== undefined) meta.setDeck(config.deck);
    startRunMode({
      mode: config.mode ?? "campaign",
      seed: config.seed ?? DEFAULT_SEED,
      ascension: config.ascension ?? 0,
      contractId: config.contractId ?? null,
      dailyDate: config.dailyDate ?? null,
      ...(config.mutators === undefined ? {} : { mutators: config.mutators }),
    });
    if (config.node !== undefined) {
      useAppStore.getState().go("map");
      jumpTo(config.node);
      return;
    }
    if ((config.land ?? "map") === "map") useAppStore.getState().go("map");
  },

  grantMeta: applyMeta,

  grantRun: applyRun,

  setBattle: (patch) => {
    if (patch.snapshot !== undefined) {
      hydrateBattle(patch.snapshot);
      useAppStore.getState().go("battle");
      return;
    }
    const run = useRunStore.getState();
    const deck =
      patch.deck ?? (run.deck.length > 0 ? run.deck.map((d) => d.defId) : null);
    if (deck === null) return;
    useBattleStore.getState().reset();
    useBattleStore.getState().startBattle(
      {
        enemyIds: [...(patch.enemyIds ?? [STARTER_ENEMY])],
        shipId: patch.shipId ?? run.shipId,
        ...(patch.hull === undefined ? {} : { hull: patch.hull }),
        ...(patch.hullMax === undefined ? {} : { hullMax: patch.hullMax }),
        ...(patch.tide === undefined ? {} : { tide: patch.tide }),
        ...(patch.interference === undefined
          ? {}
          : { interference: patch.interference }),
        ...(patch.perks === undefined ? {} : { perks: patch.perks }),
        ...(patch.modules === undefined ? {} : { modules: patch.modules }),
        ...(patch.chargeCap === undefined ? {} : { chargeCap: patch.chargeCap }),
        ...(patch.startCharge === undefined
          ? {}
          : { startCharge: patch.startCharge }),
        ...(patch.ascension === undefined ? {} : { ascension: patch.ascension }),
      },
      deck,
      createStreams(patch.seed ?? DEFAULT_SEED),
    );
    useAppStore.getState().go("battle");
  },

  skipToNode: (nodeId) => jumpTo(nodeId),

  settings: applySettings,

  now: (at) => {
    if (at === undefined) return clockNow();
    setClockSource(at === null ? null : () => at);
    return clockNow();
  },

  go: (screen, params) => {
    useAppStore.getState().go(screen, params);
  },

  mapNodes: () => {
    const run = useRunStore.getState();
    const map = run.map;
    if (map === null) return [];
    const outgoing = new Set(
      map.edges
        .filter(([a]) => a === run.position)
        .map(([, b]) => b),
    );
    return map.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      row: node.row,
      visited: run.visited.includes(node.id),
      reachable: outgoing.has(node.id) && !run.visited.includes(node.id),
    }));
  },

  slotsFor: (uid) => {
    const battle = useBattleStore.getState();
    const snapshot = battleSnapshot(battle);
    return (Object.keys(battle.slots) as SlotId[]).filter((slotId) =>
      canPlaceDie(snapshot, uid, slotId),
    );
  },

  anchors: () => battleAnchors(),

  state: readState,

  reset: () => {
    discardActiveRun();
    clearRun();
    useAppStore.getState().go("menu");
  },
});

declare global {
  interface Window {
    caTest?: TestApi;
  }
}

export const mountTestApi = (): void => {
  window.caTest = createTestApi();
  document.documentElement.setAttribute("data-e2e", TEST_API_MARKER);
};
