import { ALL_COACH_MARK_IDS, HINT_IDS } from "@/game/tutorial";
import { totalXpForLevel } from "@/game/xp";
import {
  chooseBattleLayout,
  chooseBridgeFrame,
  chooseChartLayout,
  chooseRollStyle,
} from "@/services/prefs";
import type { ShipId } from "@/data/ships";
import { gainShipRankXp } from "@/game/run/shipRanks";
import type { MetaPatch, RunPatch } from "@/services/testApiTypes";
import { useMetaStore } from "@/stores/metaStore";
import { useRunStore } from "@/stores/runStore";
import {
  grantCargo,
  grantDie,
  grantModule,
  grantOfficer,
} from "@/game/run/inventory";
import { useSettingsStore, type SettingsValues } from "@/stores/settingsStore";

export const applyMeta = (patch: MetaPatch): void => {
  const meta = useMetaStore.getState();
  for (const id of patch.ships ?? []) meta.buyShip(id, 0);
  if (patch.selectedShip !== undefined) {
    meta.buyShip(patch.selectedShip, 0);
    meta.selectShip(patch.selectedShip);
  }
  for (const [id, xp] of Object.entries(patch.shipMasteryXp ?? {})) {
    meta.addShipMasteryXp(id as ShipId, xp);
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
  for (let i = 0; i < (patch.chartFreeRespecs ?? 0); i += 1) {
    meta.grantChartRespec();
  }
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
  if (patch.echo !== undefined) meta.selectEcho(patch.echo);
  if (patch.ascensionCleared !== undefined && patch.ascensionCleared > 0) {
    meta.recordCampaignClear(patch.ascensionCleared - 1);
  }
};

export const applyRun = (patch: RunPatch): void => {
  const run = useRunStore.getState();
  if (patch.scrap !== undefined) {
    const delta = patch.scrap - useRunStore.getState().scrap;
    if (delta > 0) run.addScrap(delta);
    else if (delta < 0) run.spendScrap(-delta);
  }
  if (patch.hull !== undefined) run.setHull(patch.hull);
  if (patch.vouchers !== undefined) run.addVoucher(patch.vouchers);
  for (const defId of patch.dice ?? []) grantDie(defId);
  for (const id of patch.perks ?? []) run.addPerk(id);
  for (const id of patch.modules ?? []) grantModule(id);
  for (const key of patch.flags ?? []) run.setFlag(key);
  for (const id of patch.officers ?? []) grantOfficer(id);
  for (const id of patch.cargo ?? []) grantCargo(id);
  if (patch.visited !== undefined) {
    useRunStore.setState({ visited: [...patch.visited] });
  }
  if (patch.wormholeRides !== undefined) {
    useRunStore.setState((s) => ({
      stats: { ...s.stats, wormholeRides: patch.wormholeRides ?? 0 },
    }));
  }
  for (const defId of patch.usedMinibosses ?? []) run.markMinibossUsed(defId);
  if (patch.shipRankXp !== undefined) gainShipRankXp(patch.shipRankXp);
  if (patch.echo !== undefined) {
    useRunStore.setState({ echo: patch.echo, echoUsed: false });
  }
};

export const applySettings = (patch: Partial<SettingsValues>): void => {
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
  if (patch.vignette !== undefined) settings.setVignette(patch.vignette);
  if (patch.theme !== undefined) settings.setTheme(patch.theme);
  if (patch.fontScale !== undefined) settings.setFontScale(patch.fontScale);
  if (patch.battleSpeed !== undefined) settings.setBattleSpeed(patch.battleSpeed);
  if (patch.skipTally !== undefined) settings.setSkipTally(patch.skipTally);
  if (patch.voice !== undefined) settings.setVoice(patch.voice);
  if (patch.haptics !== undefined) settings.setHaptics(patch.haptics);
  if (patch.battleLayout !== undefined) chooseBattleLayout(patch.battleLayout);
  if (patch.bridgeFrame !== undefined) chooseBridgeFrame(patch.bridgeFrame);
  if (patch.chartLayout !== undefined) chooseChartLayout(patch.chartLayout);
  if (patch.rollStyle !== undefined) chooseRollStyle(patch.rollStyle);
};
