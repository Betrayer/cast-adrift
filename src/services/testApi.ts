import { forgeOptions } from "@/game/dice/forge";
import { forgeInRun } from "@/game/run/forge";
import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { slotCapForMk } from "@/data/slots";
import {
  enemyForecast,
  legalTargets,
  mitigationOf,
  projectBoard,
  projectSlot,
  type Mitigation,
  type SlotProjection,
  type TurnForecast,
} from "@/game/battle/view";
import { nextCoachMark } from "@/game/tutorial";
import type { NodeId } from "@/game/map/types";
import { isGentleRide, type WormholeThrow } from "@/game/map/wormhole";
import { clearSfxLog, recentSfx, type SfxCall } from "@/services/audio";
import {
  bypassLethal,
  bypassPctFor,
  holeTollFor,
} from "@/game/run/motifs";
import { ACHIEVEMENTS } from "@/data/achievements";
import { settleLifetimeAchievements } from "@/game/meta/achievements";
import {
  flashVignette,
  lastVignetteFlash,
  setVignetteRim,
  vignetteRims,
  type VignetteFlashKind,
  type VignetteRimKind,
  type VignetteSide,
} from "@/services/vignette";
import {
  chaosMocked,
  scriptedChaos,
  setChaosSource,
  type ChaosScript,
} from "@/services/chaos";
import { trackedEvents } from "@/services/analytics";
import i18n from "i18next";
import { captainName } from "@/game/run/boards";
import { dieCardModel, evLabel } from "@/game/dice/card";
import {
  advanceSector,
  discardActiveRun,
  jumpTo,
  startRunMode,
} from "@/game/run/flow";
import { isoWeekKey } from "@/game/run/modes";
import { ZERO_SHARD_BREAKDOWN } from "@/game/xp";
import { DRIFT_ALLTIME_BOARD, submit, top } from "@/services/leaderboards";
import { profileSummary, readMetaDocFromServer } from "@/services/metaDoc";
import { now as clockNow, setClockSource } from "@/services/clock";
import { activeUid } from "@/services/profile";
import {
  chooseBattleLayout,
  chooseChartLayout,
  chooseRollStyle,
} from "@/services/prefs";
import {
  readChartBackdrop,
  type ChartBackdropStats,
} from "@/screens/Chart/backdropStats";
import { createStreams } from "@/services/rng";
import { clearRun } from "@/services/save";
import { seedStackFor, startTargetFor } from "@/services/start-param";
import { useAppStore } from "@/stores/appStore";
import {
  battleSnapshot,
  hydrateBattle,
  useBattleStore,
} from "@/stores/battleStore";
import { useLootStore } from "@/stores/lootStore";
import { useMetaStore } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import { emitBark, resetBarkMemory } from "@/game/narrative/barks";
import type { JournalEntry } from "@/game/run/journal";
import {
  useRunStore,
  type BattleTally,
  type PendingRewards,
} from "@/stores/runStore";
import type { SettingsValues } from "@/stores/settingsStore";
import { useSummaryStore, type RunResult } from "@/stores/summaryStore";
import { battleAnchors, dieAtClient, readHalos, type BattleAnchors } from "@/pixi/battle/anchors";
import { capturedTarget, draggedDie } from "@/pixi/battle/dragState";
import { readFrames, readPerf, type PerfSnapshot } from "@/pixi/perf";
import { faceOf } from "@/dice3d/faceLog";
import type { BattleLayoutId, ChartLayoutId, RollStyle, ScreenId } from "@/types";
import type { SlotId } from "@/types/battle";
import type {
  AccountView,
  AchievementsView,
  BattlePatch,
  CargoHoldView,
  CloudMetaView,
  DieCardView,
  FeedView,
  HoleBandView,
  HoleSpotView,
  InsetProfile,
  JournalView,
  MapNodeView,
  MetaPatch,
  RideOutcome,
  RunPatch,
  SeedRunConfig,
  ShipCardView,
  SummaryPatch,
  TestState,
  VignetteView,
  WormholeEdgeView,
  WormholeView,
} from "@/services/testApiTypes";
import { readAccount, readState } from "@/services/testApiState";
import { applyMeta, applyRun, applySettings } from "@/services/testApiPatches";
import { mapProbes } from "@/services/testApiMap";

export type {
  SeedRunConfig,
  RunPatch,
  BattlePatch,
  DieCardView,
  ShipCardView,
  MapNodeView,
  WormholeEdgeView,
  InsetProfile,
  AchievementsView,
  VignetteView,
  WormholeView,
  FeedView,
  JournalView,
  AccountView,
  CloudMetaView,
  TestState,
  CargoHoldView,
} from "@/services/testApiTypes";

const TG_INSET_VARS = [
  ["--tg-viewport-safe-area-inset-top", "top"],
  ["--tg-viewport-safe-area-inset-bottom", "bottom"],
  ["--tg-viewport-safe-area-inset-left", "left"],
  ["--tg-viewport-safe-area-inset-right", "right"],
  ["--tg-viewport-content-safe-area-inset-top", "contentTop"],
  ["--tg-viewport-content-safe-area-inset-bottom", "contentBottom"],
] as const;

export interface TestApi {
  seedRun: (config?: SeedRunConfig) => void;
  grantMeta: (patch: MetaPatch) => void;
  grantRun: (patch: RunPatch) => void;
  setBattle: (patch: BattlePatch) => void;
  skipToNode: (nodeId: NodeId) => boolean;
  standAt: (nodeId: NodeId) => boolean;
  advanceAct: () => void;
  cargo: () => CargoHoldView[];
  deliveryApproach: (nodeId: NodeId) => NodeId | null;
  holes: () => WormholeEdgeView[];
  spots: () => HoleSpotView[];
  band: () => HoleBandView | null;
  landings: (hole: NodeId) => NodeId[];
  ride: (holeId: NodeId) => WormholeThrow | null;
  rideOutcome: (holeId: NodeId) => RideOutcome;
  wormhole: () => WormholeView;
  achievements: () => AchievementsView;
  settleAchievements: () => string[];
  mockChaos: (script: ChaosScript | null) => void;
  vignette: () => VignetteView;
  fireVignette: (kind: VignetteFlashKind, side?: VignetteSide) => void;
  vignetteRim: (kind: VignetteRimKind, on: boolean) => void;
  dropLoot: (defId: string | null) => void;
  summaryFinds: (defIds: readonly string[], shards: number) => void;
  rewards: (bundle: PendingRewards, options?: { tally?: BattleTally | null }) => void;
  summary: (patch: SummaryPatch) => void;
  insets: (profile: InsetProfile | null) => void;
  settings: (patch: Partial<SettingsValues>) => void;
  layout: (id: BattleLayoutId) => void;
  chartLayout: (id: ChartLayoutId) => void;
  chartBackdrop: () => ChartBackdropStats;
  dieFace: (uid: string) => number | null;
  halos: () => { uid: string; school: string; tint: string }[];
  rollStyle: (id: RollStyle) => void;
  forge: (a: string, b: string, signature: string) => boolean;
  forecast: () => TurnForecast | null;
  projection: (slotId: SlotId) => SlotProjection | null;
  now: (at?: number | null) => number;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  back: () => void;
  deepLink: (param: string) => boolean;
  showMemory: (order: number) => void;
  feed: () => FeedView[];
  journal: () => JournalView[];
  bark: (trigger: string) => void;
  resetBarks: () => void;
  sfx: () => readonly SfxCall[];
  resetSfx: () => void;
  mapNodes: () => MapNodeView[];
  slotsFor: (uid: string) => SlotId[];
  dieCard: (defId: string) => DieCardView | null;
  shipCard: (shipId: ShipId) => ShipCardView | null;
  setTarget: (targetId: string) => void;
  mitigation: (enemyId: string) => Mitigation | null;
  tally: () => BattleTally | null;
  coach: () => { active: string | null; seen: string[] };
  events: () => { name: string; params: Record<string, string | number | boolean>; at: number }[];
  resetTutorial: () => void;
  skipCheck: () => void;
  restartCheckStep: () => void;
  anchors: () => BattleAnchors | null;
  dieAt: (clientX: number, clientY: number) => string | null;
  drag: () => { uid: string | null; captured: string | null };
  frames: () => number;
  perf: () => PerfSnapshot;
  state: () => TestState;
  account: () => AccountView;
  cloudMeta: () => Promise<CloudMetaView | null>;
  submitDriftScore: (score: number) => Promise<boolean>;
  boardUids: () => Promise<string[]>;
  reset: () => void;
}

export const TEST_API_MARKER = "ca-test-api";

const EMPTY_RUN_RESULT: RunResult = {
  xpGain: 0,
  shardGain: 0,
  shards: ZERO_SHARD_BREAKDOWN,
  findShards: 0,
  firstFinds: [],
  achievements: [],
  achievementShards: 0,
  unlocks: [],
  unlockIds: [],
  fromLevel: 1,
  toLevel: 1,
  win: true,
  cause: null,
  milestones: [],
  mode: "campaign",
  score: null,
  contractId: null,
  contractStars: 0,
  rotation: [],
};

const journalLineOf = (entry: JournalEntry): string | null => {
  switch (entry.k) {
    case "bark":
    case "system":
      return entry.line;
    case "consequence":
      return entry.origin;
    case "choice":
      return entry.text;
    case "achievement":
      return entry.achievement;
    case "cargo":
      return `run:journal.cargo.${entry.step}`;
    default:
      return null;
  }
};

const STARTER_ENEMY = "raider";
const DEFAULT_SEED = 7;
const BOARD_PROBE_DEPTH = 60;

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
    for (let index = 1; index < (config.sector ?? 1); index += 1) {
      advanceSector();
    }
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
    for (const [slotId, mk] of Object.entries(patch.mkLevels ?? {})) {
      if (mk !== undefined) run.setMk(slotId as SlotId, mk);
    }
    const deck = patch.deck ?? (run.deck.length > 0 ? run.deck : null);
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
        ...(patch.inverted === undefined ? {} : { inverted: patch.inverted }),
        ...(patch.officers === undefined
          ? {}
          : { officers: [...patch.officers] }),
        ...(patch.echo === undefined ? {} : { echo: patch.echo }),
        ...(patch.reinforcements === undefined
          ? {}
          : { reinforcements: [...patch.reinforcements] }),
      },
      deck,
      createStreams(patch.seed ?? DEFAULT_SEED),
    );
    if (patch.shield !== undefined) useBattleStore.setState({ shield: patch.shield });
    if (patch.scrap !== undefined) useBattleStore.setState({ scrap: patch.scrap });
    useAppStore.getState().go("battle");
  },

  skipToNode: (nodeId) => jumpTo(nodeId),

  advanceAct: () => {
    advanceSector();
  },

  settings: applySettings,

  layout: chooseBattleLayout,
  chartLayout: chooseChartLayout,
  chartBackdrop: () => readChartBackdrop(),
  dieFace: faceOf,
  halos: () =>
    readHalos().map((halo) => ({
      uid: halo.uid,
      school: halo.school,
      tint: `#${halo.tint.toString(16).padStart(6, "0")}`,
    })),
  rollStyle: chooseRollStyle,
  forge: (a, b, signature) => {
    const deck = useRunStore.getState().deck;
    const first = deck.find((die) => die.uid === a);
    const second = deck.find((die) => die.uid === b);
    if (first === undefined || second === undefined) return false;
    const option = forgeOptions(first, second).find((candidate) =>
      candidate.kind === "recipe"
        ? signature === "recipe"
        : candidate.signature === signature,
    );
    return option === undefined ? false : forgeInRun(option);
  },

  forecast: () => {
    const battle = useBattleStore.getState();
    if (battle.phase !== "placement") return null;
    return enemyForecast(battleSnapshot(battle));
  },

  projection: (slotId) => {
    const battle = useBattleStore.getState();
    if (battle.phase !== "placement") return null;
    const snapshot = battleSnapshot(battle);
    if (snapshot.slots[slotId]?.dieUid !== undefined) {
      return projectBoard(snapshot)[slotId] ?? null;
    }
    const subject = battle.selectedDieUid;
    if (subject === null) return null;
    return projectSlot(snapshot, subject, slotId);
  },

  now: (at) => {
    if (at === undefined) return clockNow();
    setClockSource(at === null ? null : () => at);
    return clockNow();
  },

  go: (screen, params) => {
    useAppStore.getState().go(screen, params);
  },

  back: () => {
    useAppStore.getState().back();
  },

  deepLink: (param) => {
    const target = startTargetFor(param);
    if (target === null) return false;
    useAppStore
      .getState()
      .seed(seedStackFor(target), target.screen, target.params);
    return true;
  },

  showMemory: (order) => {
    useNarrativeStore.getState().pushMemory(order);
  },

  feed: () =>
    useNarrativeStore.getState().feed.map((message, index) => ({
      id: message.id,
      source: message.source,
      key: message.key,
      journalId: message.journalId,
      compressed: index > 0,
      shownMs: message.shownMs,
    })),

  journal: () =>
    useNarrativeStore.getState().journal.map((entry) => ({
      id: entry.id,
      kind: entry.k,
      sector: entry.sector,
      line: journalLineOf(entry),
    })),

  bark: (trigger) => {
    emitBark(trigger);
  },

  resetBarks: () => {
    resetBarkMemory();
  },

  sfx: () => recentSfx(),

  resetSfx: () => {
    clearSfxLog();
  },

  ...mapProbes(),

  wormhole: () => {
    const run = useRunStore.getState();
    const toll = holeTollFor(run.sector, run.hullMax, run.ascension);
    return {
      pending: run.pendingWormhole,
      rides: run.stats.wormholeRides,
      bypassed: run.stats.holesBypassed,
      gentle: isGentleRide(run.stats.wormholeRides),
      toll,
      pct: bypassPctFor(run.sector, run.ascension),
      lethal: bypassLethal(run.hull, toll),
      mocked: chaosMocked(),
      last: run.lastWormhole === null ? null : { ...run.lastWormhole },
    };
  },

  achievements: () => {
    const meta = useMetaStore.getState();
    const seen = new Set(meta.achievementsSeen);
    return {
      total: ACHIEVEMENTS.length,
      earned: [...meta.achievements],
      unseen: meta.achievements.filter((id) => !seen.has(id)).length,
      vouchers: meta.vouchers.perkDraft,
      offers: [...meta.voucherOffers],
    };
  },

  settleAchievements: () =>
    settleLifetimeAchievements().unlocked.map((def) => def.id),

  mockChaos: (script) => {
    setChaosSource(script === null ? null : scriptedChaos(script));
  },

  vignette: () => {
    const flash = lastVignetteFlash();
    return {
      last: flash?.kind ?? null,
      seq: flash?.seq ?? 0,
      rims: { ...vignetteRims() },
    };
  },

  fireVignette: (kind, side) => {
    flashVignette(kind, side === undefined ? {} : { side });
  },

  vignetteRim: (kind, on) => {
    setVignetteRim(kind, on);
  },

  dropLoot: (defId) => {
    if (defId === null) useLootStore.getState().clear();
    else useLootStore.getState().drop(defId);
  },

  rewards: (bundle, options) => {
    const run = useRunStore.getState();
    run.setPendingRewards(null);
    run.setPendingRewards({ ...bundle });
    useRunStore.setState({ lastTally: options?.tally ?? null });
    useAppStore.getState().go("rewards");
  },

  insets: (profile) => {
    const style = document.documentElement.style;
    for (const [variable, field] of TG_INSET_VARS) {
      const value = profile?.[field];
      if (value === undefined || profile === null) style.removeProperty(variable);
      else style.setProperty(variable, `${String(value)}px`);
    }
    window.dispatchEvent(new Event("resize"));
  },

  summary: (patch) => {
    const store = useSummaryStore.getState();
    if (patch.result !== undefined) {
      store.setResult({ ...(store.result ?? EMPTY_RUN_RESULT), ...patch.result });
    }
    const run = useRunStore.getState();
    useRunStore.setState({
      ...(patch.run ?? {}),
      stats: { ...run.stats, ...(patch.stats ?? {}) },
    });
  },

  summaryFinds: (defIds, shards) => {
    const store = useSummaryStore.getState();
    const current = store.result;
    store.setResult({
      ...(current ?? EMPTY_RUN_RESULT),
      firstFinds: [...defIds],
      findShards: shards,
    });
  },

  slotsFor: (uid) => legalTargets(useBattleStore.getState(), uid).slots,

  dieCard: (defId) => {
    const model = dieCardModel({
      defId,
      engravings: useMetaStore.getState().engravings,
    });
    if (model === null) return null;
    return {
      defId: model.def.id,
      tier: model.def.tier,
      school: model.def.school,
      rarity: model.def.rarity,
      pts: model.def.pts,
      faces: model.faces.custom
        ? model.faces.faces.join("·")
        : i18n.t("battle:dieFaces", {
            min: model.faces.min,
            max: model.faces.max,
          }),
      custom: model.faces.custom,
      ev: evLabel(model.faces.ev),
      badges: [...model.badges],
      features: [...model.features],
    };
  },

  shipCard: (shipId) => {
    const def = SHIP_BY_ID.get(shipId);
    if (def === undefined) return null;
    const slots = Object.keys(def.slots) as SlotId[];
    return {
      shipId: def.id,
      hull: def.hullMax,
      slots,
      caps: slots.map((slotId) =>
        slotCapForMk(slotId, def.slots[slotId]?.mk ?? 1),
      ),
      passive: def.passive?.kind ?? null,
      hasPassiveText:
        def.passiveName !== undefined && def.passiveDesc !== undefined,
    };
  },

  setTarget: (targetId) => {
    useBattleStore.getState().setTarget(targetId);
  },

  mitigation: (enemyId) => {
    const battle = useBattleStore.getState();
    const enemy = battle.enemies.find((e) => e.id === enemyId);
    if (enemy === undefined) return null;
    return mitigationOf(battleSnapshot(battle), enemy);
  },

  tally: () => {
    const value = useRunStore.getState().lastTally;
    return value === null ? null : { ...value };
  },

  events: () => trackedEvents().map((e) => ({ ...e, params: { ...e.params } })),

  coach: () => {
    const seen = useMetaStore.getState().tutorialSeen;
    return {
      active: nextCoachMark(useAppStore.getState().screen, seen)?.id ?? null,
      seen: [...seen],
    };
  },

  resetTutorial: () => {
    useMetaStore.getState().resetTutorial();
  },

  skipCheck: () => {
    useBattleStore.getState().skipCheck();
  },

  restartCheckStep: () => {
    useBattleStore.getState().restartCheckStep();
  },

  anchors: () => battleAnchors(),

  dieAt: (clientX, clientY) => dieAtClient(clientX, clientY),

  drag: () => ({ uid: draggedDie(), captured: capturedTarget() }),

  frames: () => readFrames(),

  perf: () => readPerf(),

  state: readState,

  account: readAccount,

  cloudMeta: async () => {
    const uid = activeUid();
    if (uid === null) return null;
    const doc = await readMetaDocFromServer(uid);
    if (doc === null) return null;
    const summary = profileSummary(doc);
    return {
      updatedAt: doc.updatedAt,
      level: summary.level,
      shards: summary.shards,
      runs: summary.runs,
      linkedFrom: doc.linkedFrom ?? null,
    };
  },

  submitDriftScore: async (score) => {
    const uid = useAppStore.getState().uid;
    if (uid === null) return false;
    const meta = useMetaStore.getState();
    meta.recordDriftScore(score, isoWeekKey(Date.now()));
    return await submit(DRIFT_ALLTIME_BOARD, {
      uid,
      name: captainName(),
      score,
      level: useMetaStore.getState().level,
      ship: useMetaStore.getState().selectedShip,
      depth: BOARD_PROBE_DEPTH,
      kills: 10,
      scrap: 200,
      updatedAt: Date.now(),
    });
  },

  boardUids: async () =>
    (await top(DRIFT_ALLTIME_BOARD)).map((entry) => entry.uid),

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
