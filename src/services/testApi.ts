import { SHIP_BY_ID, type ShipId } from "@/data/ships";
import { slotCapForMk } from "@/data/slots";
import {
  enemyForecast,
  legalTargets,
  mitigationOf,
  type Mitigation,
  type TurnForecast,
} from "@/game/battle/view";
import { ALL_COACH_MARK_IDS, HINT_IDS, nextCoachMark } from "@/game/tutorial";
import {
  edgeKey,
  nodeById,
  type NodeId,
} from "@/game/map/types";
import {
  budgetCapFor,
  isGentleRide,
  landingCandidates,
  type ThrowDirection,
  type WormholeThrow,
} from "@/game/map/wormhole";
import { holeTollFor } from "@/game/run/motifs";
import { ACHIEVEMENTS } from "@/data/achievements";
import { settleLifetimeAchievements } from "@/game/meta/achievements";
import {
  chaosMocked,
  scriptedChaos,
  setChaosSource,
  type ChaosScript,
} from "@/services/chaos";
import { lastClaimOutcome } from "@/services/account";
import { trackedEvents } from "@/services/analytics";
import { readClaim } from "@/services/account-link";
import i18n from "i18next";
import { captainName } from "@/game/run/boards";
import { dieCardModel, evLabel } from "@/game/dice/card";
import {
  advanceSector,
  discardActiveRun,
  jumpTo,
  openWormhole,
  rideWormhole,
  startRunMode,
} from "@/game/run/flow";
import { isoWeekKey } from "@/game/run/modes";
import { totalXpForLevel } from "@/game/xp";
import { DRIFT_ALLTIME_BOARD, submit, top } from "@/services/leaderboards";
import { profileSummary, readMetaDocFromServer } from "@/services/metaDoc";
import { now as clockNow, setClockSource } from "@/services/clock";
import { activeUid, deviceKeys, scopedKey } from "@/services/profile";
import { profileSwitches } from "@/services/profileSwitch";
import { battleLayoutId, chooseBattleLayout } from "@/services/prefs";
import { createStreams } from "@/services/rng";
import { clearRun } from "@/services/save";
import { seedStackFor, startTargetFor } from "@/services/start-param";
import { canGoBack, useAppStore } from "@/stores/appStore";
import {
  battleSnapshot,
  hydrateBattle,
  useBattleStore,
  type BattleSaveState,
} from "@/stores/battleStore";
import { useMetaStore, type MetaStats } from "@/stores/metaStore";
import { useNarrativeStore } from "@/stores/narrativeStore";
import {
  useRunStore,
  type BattleTally,
  type RunMode,
} from "@/stores/runStore";
import { useSettingsStore, type SettingsValues } from "@/stores/settingsStore";
import { battleAnchors, type BattleAnchors } from "@/pixi/battle/anchors";
import type { BattleLayoutId, ScreenId } from "@/types";
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
  sector?: number;
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
  systemsCheckDone?: boolean;
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
  visited?: readonly NodeId[];
  wormholeRides?: number;
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
  inverted?: boolean;
  snapshot?: BattleSaveState;
}

export interface DieCardView {
  defId: string;
  tier: number;
  school: string;
  rarity: string;
  pts: number;
  faces: string;
  custom: boolean;
  ev: string;
  badges: string[];
  features: string[];
}

export interface ShipCardView {
  shipId: string;
  hull: number;
  slots: string[];
  caps: number[];
  passive: string | null;
  hasPassiveText: boolean;
}

export interface MapNodeView {
  id: NodeId;
  type: string;
  row: number;
  lane: number;
  visited: boolean;
  reachable: boolean;
  hole: boolean;
  wormhole: boolean;
  bypass: NodeId | null;
}

export interface WormholeEdgeView {
  from: NodeId;
  hole: NodeId;
  bypass: NodeId;
}

export interface AchievementsView {
  total: number;
  earned: string[];
  unseen: number;
  vouchers: number;
  offers: string[];
}

export interface WormholeView {
  pending: NodeId | null;
  rides: number;
  bypassed: number;
  gentle: boolean;
  budgetCap: number;
  toll: number;
  mocked: boolean;
  last: WormholeThrow | null;
}

export interface DieView {
  uid: string;
  defId: string;
  school: string;
  value: number;
  tier: number;
  state: string;
  slot: SlotId | null;
  temp: boolean;
}

export interface AccountView {
  uid: string | null;
  isAnonymous: boolean;
  providers: string[];
  email: string | null;
  namespace: string;
  activeUid: string | null;
  switches: number;
  authError: string | null;
  authBusy: boolean;
  claimOutcome: string | null;
  claimSource: string | null;
  merge: {
    sourceUid: string;
    targetUid: string;
    recommended: string;
    sourceLevel: number;
    targetLevel: number;
  } | null;
  keys: string[];
}

export interface CloudMetaView {
  updatedAt: number;
  level: number;
  shards: number;
  runs: number;
  linkedFrom: string | null;
}

export interface TestState {
  screen: ScreenId;
  layout: BattleLayoutId;
  params: Record<string, string> | null;
  uid: string | null;
  nav: {
    stack: { screen: ScreenId; params: Record<string, string> | null }[];
    canBack: boolean;
    systemMenu: boolean;
  };
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
    shipId: ShipId;
    passiveUsed: boolean;
    nextWeapons: number;
    selectedDieUid: string | null;
    dice: DieView[];
    slots: { id: SlotId; dieUid: string | null }[];
    enemies: {
      id: string;
      defId: string;
      hp: number;
      hpMax: number;
      shield: number;
      vulnerable: number;
    }[];
    evasion: { dodgePct: number; glancingPct: number; intercept: boolean } | null;
    freeNudges: number;
    lastBlock: string | null;
    check: {
      stepId: string;
      stepIndex: number;
      stepCount: number;
      moves: { uid: string; slot: SlotId }[] | null;
      sandbox: boolean;
    } | null;
    sensorBeats: { vulnerable: number; pierce: number }[];
    attackBeats: {
      amount: number;
      hullDamage: number;
      dodged: number;
      glanced: number;
    }[];
  };
  meta: {
    level: number;
    xp: number;
    shards: number;
    selectedShip: ShipId;
    tutorialSeen: string[];
    systemsCheckDone: boolean;
  };
}

export interface TestApi {
  seedRun: (config?: SeedRunConfig) => void;
  grantMeta: (patch: MetaPatch) => void;
  grantRun: (patch: RunPatch) => void;
  setBattle: (patch: BattlePatch) => void;
  skipToNode: (nodeId: NodeId) => boolean;
  standAt: (nodeId: NodeId) => boolean;
  holes: () => WormholeEdgeView[];
  landings: (budget: number, direction: ThrowDirection) => NodeId[];
  ride: (holeId: NodeId) => WormholeThrow | null;
  wormhole: () => WormholeView;
  achievements: () => AchievementsView;
  settleAchievements: () => string[];
  mockChaos: (script: ChaosScript | null) => void;
  settings: (patch: Partial<SettingsValues>) => void;
  layout: (id: BattleLayoutId) => void;
  forecast: () => TurnForecast | null;
  now: (at?: number | null) => number;
  go: (screen: ScreenId, params?: Record<string, string>) => void;
  back: () => void;
  deepLink: (param: string) => boolean;
  showMemory: (order: number) => void;
  mapNodes: () => MapNodeView[];
  slotsFor: (uid: string) => SlotId[];
  dieCard: (defId: string) => DieCardView | null;
  shipCard: (shipId: ShipId) => ShipCardView | null;
  mitigation: (enemyId: string) => Mitigation | null;
  tally: () => BattleTally | null;
  coach: () => { active: string | null; seen: string[] };
  events: () => { name: string; params: Record<string, string | number | boolean>; at: number }[];
  resetTutorial: () => void;
  skipCheck: () => void;
  restartCheckStep: () => void;
  anchors: () => BattleAnchors | null;
  state: () => TestState;
  account: () => AccountView;
  cloudMeta: () => Promise<CloudMetaView | null>;
  submitDriftScore: (score: number) => Promise<boolean>;
  boardUids: () => Promise<string[]>;
  reset: () => void;
}

export const TEST_API_MARKER = "ca-test-api";

const STARTER_ENEMY = "raider";
const DEFAULT_SEED = 7;
const BOARD_PROBE_DEPTH = 60;

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
  if (patch.systemsCheckDone === true) meta.markSystemsCheckDone();
  if (patch.tutorialSeen !== undefined) {
    const ids =
      patch.tutorialSeen === "all"
        ? [...ALL_COACH_MARK_IDS, ...HINT_IDS]
        : patch.tutorialSeen;
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
  if (patch.visited !== undefined) {
    useRunStore.setState({ visited: [...patch.visited] });
  }
  if (patch.wormholeRides !== undefined) {
    useRunStore.setState((s) => ({
      stats: { ...s.stats, wormholeRides: patch.wormholeRides ?? 0 },
    }));
  }
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
  if (patch.skipTally !== undefined) settings.setSkipTally(patch.skipTally);
  if (patch.battleLayout !== undefined) chooseBattleLayout(patch.battleLayout);
};

const readState = (): TestState => {
  const app = useAppStore.getState();
  const run = useRunStore.getState();
  const battle = useBattleStore.getState();
  const meta = useMetaStore.getState();
  const checkStep = battle.checkSteps?.[battle.checkIndex];
  return {
    screen: app.screen,
    layout: battleLayoutId(),
    params: app.params ?? null,
    uid: app.uid,
    nav: {
      stack: app.stack.map((entry) => ({
        screen: entry.screen,
        params: entry.params ?? null,
      })),
      canBack: canGoBack(app),
      systemMenu: app.systemMenu,
    },
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
      shipId: battle.shipId,
      passiveUsed: battle.passiveUsed,
      nextWeapons: battle.nextTurnMods.weapons ?? 0,
      selectedDieUid: battle.selectedDieUid,
      dice: battle.dice.map((d) => ({
        uid: d.uid,
        defId: d.defId,
        school: d.school,
        value: d.value,
        tier: d.tier,
        state: d.state,
        slot: d.slot ?? null,
        temp: d.temp === true,
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
        shield: e.shield,
        vulnerable: e.statuses.mark ?? 0,
      })),
      evasion: battle.evasion,
      freeNudges: battle.freeNudges,
      lastBlock: battle.lastBlock?.key ?? null,
      check: checkStep === undefined
        ? null
        : {
            stepId: checkStep.id,
            stepIndex: battle.checkIndex,
            stepCount: battle.checkSteps?.length ?? 0,
            moves:
              checkStep.moves == null
                ? null
                : checkStep.moves.map((m) => ({ uid: m.uid, slot: m.slot })),
            sandbox: battle.checkSandbox,
          },
      sensorBeats: battle.beats
        .filter((b) => b.kind === "sensor" && b.sensor !== undefined)
        .map((b) => ({
          vulnerable: b.sensor?.vulnerable ?? 0,
          pierce: b.sensor?.pierce ?? 0,
        })),
      attackBeats: battle.enemyBeats
        .filter((b) => b.kind === "attack")
        .map((b) => ({
          amount: b.amount,
          hullDamage: b.hullDamage,
          dodged: b.dodged ?? 0,
          glanced: b.glanced ?? 0,
        })),
    },
    meta: {
      level: meta.level,
      xp: meta.xp,
      shards: meta.shards,
      selectedShip: meta.selectedShip,
      tutorialSeen: [...meta.tutorialSeen],
      systemsCheckDone: meta.stats.systemsCheckDone,
    },
  };
};

const readAccount = (): AccountView => {
  const app = useAppStore.getState();
  const merge = app.merge;
  return {
    uid: app.uid,
    isAnonymous: app.account?.isAnonymous ?? true,
    providers: [...(app.account?.providers ?? [])],
    email: app.account?.email ?? null,
    namespace: scopedKey("meta"),
    activeUid: activeUid(),
    switches: profileSwitches(),
    authError: app.authError,
    authBusy: app.authBusy,
    claimOutcome: lastClaimOutcome(),
    claimSource: readClaim()?.sourceUid ?? null,
    merge:
      merge === null
        ? null
        : {
            sourceUid: merge.sourceUid,
            targetUid: merge.targetUid,
            recommended: merge.recommended,
            sourceLevel: merge.source.level,
            targetLevel: merge.target.level,
          },
    keys: deviceKeys()
      .filter((key) => key.startsWith("ca."))
      .sort(),
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
        ...(patch.inverted === undefined ? {} : { inverted: patch.inverted }),
      },
      deck,
      createStreams(patch.seed ?? DEFAULT_SEED),
    );
    useAppStore.getState().go("battle");
  },

  skipToNode: (nodeId) => jumpTo(nodeId),

  settings: applySettings,

  layout: chooseBattleLayout,

  forecast: () => {
    const battle = useBattleStore.getState();
    if (battle.phase !== "placement") return null;
    return enemyForecast(battleSnapshot(battle));
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

  mapNodes: () => {
    const run = useRunStore.getState();
    const map = run.map;
    if (map === null) return [];
    const outgoing = new Set(
      map.edges
        .filter(([a]) => a === run.position)
        .map(([, b]) => b),
    );
    return map.nodes.map((node) => {
      const record =
        run.position === null
          ? undefined
          : map.wormholes[edgeKey(run.position, node.id)];
      return {
        id: node.id,
        type: node.type,
        row: node.row,
        lane: node.lane,
        visited: run.visited.includes(node.id),
        reachable: outgoing.has(node.id) && !run.visited.includes(node.id),
        hole: node.hole === true,
        wormhole: record !== undefined,
        bypass: record?.bypass ?? null,
      };
    });
  },

  standAt: (nodeId) => {
    const run = useRunStore.getState();
    const node = run.map === null ? undefined : nodeById(run.map).get(nodeId);
    if (node === undefined) return false;
    useRunStore.setState({
      position: nodeId,
      depthRow: node.row,
      pendingWormhole: null,
    });
    useAppStore.getState().go("map");
    return true;
  },

  holes: () => {
    const map = useRunStore.getState().map;
    if (map === null) return [];
    return Object.values(map.wormholes).map((record) => ({ ...record }));
  },

  landings: (budget, direction) => {
    const run = useRunStore.getState();
    if (run.map === null || run.position === null) return [];
    return landingCandidates(
      run.map,
      run.position,
      run.visited,
      budget,
      direction,
    ).map((node) => node.id);
  },

  ride: (holeId) => {
    openWormhole(holeId);
    return rideWormhole(holeId, false);
  },

  wormhole: () => {
    const run = useRunStore.getState();
    return {
      pending: run.pendingWormhole,
      rides: run.stats.wormholeRides,
      bypassed: run.stats.holesBypassed,
      gentle: isGentleRide(run.stats.wormholeRides),
      budgetCap: budgetCapFor(run.stats.wormholeRides),
      toll: holeTollFor(run.sector, run.hull),
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
