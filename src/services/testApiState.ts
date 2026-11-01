import { forgeLevel } from "@/game/dice/tier";
import { pointsSpent, pointsTotal } from "@/game/chart/engine";
import { lastClaimOutcome } from "@/services/account";
import { readClaim } from "@/services/account-link";
import { weatherIn } from "@/game/run/weather";
import { activeUid, deviceKeys, scopedKey } from "@/services/profile";
import { profileSwitches } from "@/services/profileSwitch";
import { battleLayoutId, chartLayoutId, rollStyleId } from "@/services/prefs";
import type { AccountView, TestState } from "@/services/testApiTypes";
import { canGoBack, useAppStore } from "@/stores/appStore";
import {
  battleSnapshot,
  echoActiveSpent,
  useBattleStore,
} from "@/stores/battleStore";
import { useMetaStore } from "@/stores/metaStore";
import { coreLocked } from "@/game/battle/damage";
import { runModuleSlots, useRunStore } from "@/stores/runStore";
import type { SlotId } from "@/types/battle";

export const readState = (): TestState => {
  const app = useAppStore.getState();
  const run = useRunStore.getState();
  const battle = useBattleStore.getState();
  const meta = useMetaStore.getState();
  const checkStep = battle.checkSteps?.[battle.checkIndex];
  return {
    screen: app.screen,
    layout: battleLayoutId(),
    chartLayout: chartLayoutId(),
    rollStyle: rollStyleId(),
    params: app.params ?? null,
    uid: app.uid,
    nav: {
      stack: app.stack.map((entry) => ({
        screen: entry.screen,
        params: entry.params ?? null,
      })),
      canBack: canGoBack(app),
      systemMenu: app.systemMenu,
      echoCore: app.echoCore,
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
      hand: run.deck.map((d) => ({
        uid: d.uid,
        defId: d.defId,
        fusion: forgeLevel(d),
      })),
      modules: [...run.modules],
      bays: runModuleSlots(run),
      baysPurchased: run.baysPurchased,
      pendingSwaps: run.pendingSwaps.map((swap) => ({ ...swap })),
      visited: [...run.visited],
      mutators: [...run.mutators],
      weather: weatherIn(run.mutators)?.id ?? null,
      salvage: [...(run.pendingRewards?.salvage ?? [])],
      officers: [...run.officers],
      cargo: run.cargo.map((entry) => entry.defId),
      sectorReveal: run.sectorReveal,
      shipyardDiscount: run.shipyardDiscount,
      echo: run.echo,
      echoUsed: run.echoUsed,
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
      rollSeq: battle.rollSeq,
      fateRoll: battle.fateRoll,
      echo: battle.echo ?? null,
      echoSpent: echoActiveSpent(battle),
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
        seat: d.seat ?? null,
        fusion: d.fusion ?? 0,
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
        coreLocked: coreLocked(battleSnapshot(battle), e),
        parts: e.subsystems.map((part) => ({
          id: part.id,
          key: part.key,
          hp: part.hp,
          hpMax: part.hpMax,
          alive: part.hp > 0,
          intent: part.nextIntent ?? null,
        })),
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
      chartPicks: [...meta.chartPicks],
      chartPointsSpent: pointsSpent(meta.chartPicks),
      chartPointsTotal: pointsTotal(meta.level),
      chartFreeRespecs: meta.chartFreeRespecs,
    },
  };
};

export const readAccount = (): AccountView => {
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
