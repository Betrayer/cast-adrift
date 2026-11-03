import { create } from "zustand";
import { ENEMY_BY_ID } from "@/data/enemies";
import { echoNodeDef, echoToken, echoVetoHull } from "@/data/echo";
import {
  officerActions,
  officerActiveDead,
  officerChargeCost,
  officerDef,
  officerToken,
} from "@/data/officers";
import {
  adjacentCopyValue,
  canBank,
  canCopy,
  canFlip,
  canFuse,
  canReschool,
  canSplit,
  canSwap,
  flippedValue,
  fusedDie,
  isFuseTarget,
  isSwapTarget,
  SPLIT_DIE_COUNT,
  SPLIT_DIE_DEF,
} from "@/game/battle/actives";
import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { passiveActionOf, shipProfile } from "@/game/battle/passives";
import { appendLog, logEntriesFrom } from "@/game/battle/log";
import { resonanceAtLeast } from "@/game/battle/resonance";
import { REAL_SCHOOL_ORDER } from "@/data/schools";
import { aimedEnemy } from "@/game/battle/target";
import {
  advanceTurn,
  BASE_REROLL_SIZE,
  BLOOD_REACTOR_CHARGE,
  BLOOD_REACTOR_HULL,
  BONUS_REROLL_COST,
  resolveEnemyPhase,
  resolvePlayerPhase,
  SACRIFICE_DAMAGE,
  SURGE_COST,
} from "@/game/battle/resolver";
import { dieValueCeiling, rerollFace } from "@/game/battle/rollFloors";
import { buildBattleSnapshot, createEnemyStream } from "@/game/battle/setup";
import { assignSeats, tableSizeFor } from "@/game/battle/table";
import {
  applyCheckStep,
  applyDebugRoll,
  scriptedDefense,
} from "@/game/battle/checkScript";
import { largestResonance, tallyBundle } from "@/game/battle/tally";
import { dieHasGrant } from "@/data/engravings";
import { FATE_DIE_ID, fateOutcomeFor, type FateOutcome } from "@/data/fate";
import {
  createStreamFromState,
  restoreStreams,
  serializeStreams,
  type StreamStates,
} from "@/services/rng";
import {
  computeRunMods,
  runHasTrait,
  sourceMods,
  sourceTrait,
} from "@/game/run/runMods";
import {
  canReserve,
  checkEndTurnBlocked,
  checkMovesNow,
  currentCheckStep,
  fateMaxUses,
  modeBlockFor,
  nudgeChargePrice,
  placeBlockFor,
  slotFireModes,
  springFreeFor,
} from "@/game/battle/view";
import {
  noteCheckFinished,
  noteCheckSkipped,
  noteCheckStep,
} from "@/game/onboarding";
import { applyActions, BattleCtx, buildSources, emit } from "@/game/effects";
import { recordAction } from "@/game/run/actionLog";
import { useRunStore, type BattleTally } from "@/stores/runStore";
import { pickShape } from "@/stores/shape";
import {
  createInitialBattleValues,
  type BattleState,
  type BattleValues,
  type BlockNotice,
} from "@/stores/battleValues";
import {
  battleSnapshot,
  fromSnapshot,
  syncSnapshotFlags,
} from "@/stores/battleSnapshot";
import type {
  BattleSnapshot,
  ResolutionBundle,
  RolledDie,
  SlotId,
} from "@/types/battle";

export { createInitialBattleValues } from "@/stores/battleValues";
export type {
  BattleEncounter,
  BattleState,
  BattleValues,
} from "@/stores/battleValues";
export { battleSnapshot } from "@/stores/battleSnapshot";

const patchDie = (
  dice: readonly RolledDie[],
  uid: string,
  patch: Partial<RolledDie>,
): RolledDie[] => dice.map((d) => (d.uid === uid ? { ...d, ...patch } : d));

const secondLookTargets = (
  dice: readonly RolledDie[],
  n: number,
): readonly string[] =>
  dice
    .filter((d) => d.state === "tray")
    .slice()
    .sort((a, b) => a.value - b.value)
    .slice(0, n)
    .map((d) => d.uid);

export const echoActiveSpent = (s: BattleValues): boolean =>
  s.echo !== undefined && s.spentGrants.includes(echoToken(s.echo));

const noticeOf = (
  prev: BlockNotice | null,
  key: string,
  slotId: SlotId | null,
): BlockNotice => ({ key, slotId, seq: prev === null ? 1 : prev.seq + 1 });

export const battleTally = (s: BattleValues): BattleTally => ({
  won: s.outcome === "victory",
  turns: s.turn,
  shieldAbsorbed: s.shieldAbsorbed,
  damageDealt: s.damageDealt,
  damageTaken: s.damageTaken,
  scrap: s.scrap,
  hull: s.hull,
  hullMax: s.hullMax,
  spinalMaxHit: s.spinalMaxHit,
  rerollsUsed: s.rerollsUsed,
  repairBayHealed: s.repairBayHealed,
  endedFullHull: s.hull >= s.hullMax,
  blackPlaced: s.blackUsed,
  dicePlaced: s.dicePlaced,
  maxResonance: s.maxResonance,
  burnKilledElite: s.burnKilledElite,
});

export const grantsOf = (
  snapshot: Pick<BattleSnapshot, "grants">,
): { rerollBase: number; reserveCap: number; freeNudges: number } => ({
  rerollBase: BASE_REROLL_SIZE + (snapshot.grants?.rerollSize ?? 0),
  reserveCap: 1 + (snapshot.grants?.reserve ?? 0),
  freeNudges: snapshot.grants?.nudge ?? 0,
});

export const useBattleStore = create<BattleState>()((set, get) => ({
  ...createInitialBattleValues(),

  startBattle: (encounter, hand, streams) => {
    const shipId = encounter.shipId ?? "wanderer";
    const enemyStream = createEnemyStream(streams);
    const mkLevels = useRunStore.getState().mkLevels;
    const snapshot = buildBattleSnapshot(
      shipId,
      hand,
      encounter.enemyIds,
      streams,
      enemyStream,
      mkLevels,
      {
        tide: encounter.tide,
        interference: encounter.interference,
        perks: encounter.perks,
        chartPicks: encounter.chartPicks,
        mutators: encounter.mutators,
        modules: encounter.modules,
        engravings: encounter.engravings,
        flags: encounter.flags,
        runCounters: encounter.runCounters,
        hull: encounter.hull,
        hullMax: encounter.hullMax,
        runScrap: encounter.runScrap,
        chargeCap: encounter.chargeCap,
        ascension: encounter.ascension,
        sectorHpPct: encounter.sectorHpPct,
        sectorDmgPct: encounter.sectorDmgPct,
        enemyHpBonusPct: encounter.enemyHpBonusPct,
        eliteShield: encounter.eliteShield,
        resonanceBoost: encounter.resonanceBoost,
        slotTierDelta: encounter.slotTierDelta,
        disabledSlots: encounter.disabledSlots,
        inverted: encounter.inverted,
        nodeStorm: encounter.nodeStorm,
      },
    );
    snapshot.echo = encounter.echo;
    const perks = encounter.perks ?? [];
    const chartPicks = encounter.chartPicks ?? [];
    const modules = encounter.modules ?? [];
    const officers = encounter.officers ?? [];
    const forcedTraits = encounter.forcedTraits ?? [];
    const mods = computeRunMods(perks, chartPicks, modules, officers);
    const scrapperScrap = shipProfile(shipId).battleStartScrap;
    const singleCast =
      runHasTrait(perks, chartPicks, "singleCast", modules) ||
      forcedTraits.includes("singleCast");
    const setCharge =
      mods.setCompleteCharge *
      REAL_SCHOOL_ORDER.filter((school) =>
        resonanceAtLeast(snapshot.resonance, school, 4),
      ).length;
    const introEnemy = snapshot.enemies.find((e) => {
      const def = ENEMY_BY_ID.get(e.defId);
      return def?.boss === true || def?.miniboss === true;
    });
    snapshot.scrap = Math.max(
      0,
      snapshot.scrap + mods.battleStartScrap + scrapperScrap,
    );
    snapshot.charge = Math.max(
      0,
      Math.min(
        snapshot.chargeCap,
        snapshot.charge + (encounter.startCharge ?? 0) + setCharge,
      ),
    );
    const steps = encounter.checkSteps ?? null;
    const firstStep = steps?.[0];
    if (firstStep !== undefined) {
      const seeded = applyCheckStep(snapshot, firstStep);
      snapshot.dice = seeded.dice;
      snapshot.enemies = seeded.enemies;
      snapshot.charge = seeded.charge;
    }
    const grants = grantsOf(snapshot);
    const rerollBase =
      grants.rerollBase + mods.rerollSizeDelta + (encounter.rerollSizeBonus ?? 0);
    set({
      ...createInitialBattleValues(),
      ...fromSnapshot(snapshot),
      phase: "placement",
      introPending: introEnemy !== undefined,
      introEnemyId: introEnemy?.defId ?? null,
      checkSteps: steps === null ? null : steps.map((step) => ({ ...step })),
      checkIndex: 0,
      checkSandbox: encounter.checkSandbox === true,
      shipId,
      chartPicks: [...chartPicks],
      mutators: [...(encounter.mutators ?? [])],
      modules: [...modules],
      officers: [...officers],
      engravings: encounter.engravings ?? {},
      forcedTraits: [...forcedTraits],
      rerollsLeft: singleCast
        ? 0
        : 1 +
          Math.max(0, mods.extraRerolls) +
          (snapshot.grants?.rerollUses ?? 0),
      rerollSize: rerollBase,
      rerollBase,
      reserveCap: grants.reserveCap + mods.reserveDelta,
      freeNudges: grants.freeNudges + (firstStep?.grantFreeNudge ?? 0),
      streams,
      enemyStream,
    });
  },

  dismissIntro: () => {
    set({ introPending: false });
  },

  placeDie: (uid, slotId) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const block = placeBlockFor(s, uid, slotId);
      if (block !== null) {
        const step = currentCheckStep(s);
        const key =
          block === "notAllowed" && step?.failKey != null
            ? step.failKey
            : `battle:block.${block}`;
        return { lastBlock: noticeOf(s.lastBlock, key, slotId) };
      }
      const slot = s.slots[slotId];
      if (slot === undefined) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die !== undefined) {
        recordAction(`place:${die.defId}:${String(die.value)}:${slotId}`);
      }
      const snapshot = battleSnapshot(s);
      snapshot.dice = s.dice.map((d) =>
        d.uid === uid ? { ...d, state: "placed" as const, slot: slotId } : d,
      );
      snapshot.slots = { ...s.slots, [slotId]: { ...slot, dieUid: uid } };
      snapshot.enemies = structuredClone(s.enemies);
      const placed = snapshot.dice.find((d) => d.uid === uid);
      const ctx = new BattleCtx(snapshot, snapshot.flags);
      ctx.payload = {
        slot: slotId,
        ...(placed === undefined ? {} : { die: placed }),
      };
      emit(buildSources(snapshot), "place", ctx);
      syncSnapshotFlags(snapshot, ctx);
      return { ...fromSnapshot(snapshot), selectedDieUid: null };
    });
  },

  setSlotMode: (slotId, mode) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const slot = s.slots[slotId];
      if (slot === undefined) return s;
      const block = slotFireModes(s, slotId).includes(mode)
        ? modeBlockFor(s, slotId, mode)
        : "notAllowed";
      if (block !== null) {
        return {
          lastBlock: noticeOf(s.lastBlock, `battle:block.${block}`, slotId),
        };
      }
      if (slot.mode === mode) return s;
      return { slots: { ...s.slots, [slotId]: { ...slot, mode } } };
    });
  },

  noteBlock: (key) => {
    set((s) => {
      if (key === null) return s.lastBlock === null ? s : { lastBlock: null };
      return { lastBlock: noticeOf(s.lastBlock, key, null) };
    });
  },

  skipCheck: () => {
    const before = get();
    if (before.checkSteps === null) return;
    set({ checkSteps: null, checkIndex: 0, lastBlock: null });
    if (!before.checkSandbox) noteCheckSkipped(before.checkIndex);
    noteCheckFinished(before.checkSandbox, true);
  },

  restartCheckStep: () => {
    set((s) => {
      const step = s.checkSteps?.[s.checkIndex];
      if (step === undefined || s.phase !== "placement") return s;
      return {
        ...fromSnapshot(applyCheckStep(battleSnapshot(s), step)),
        lastBlock: null,
        selectedDieUid: null,
      };
    });
  },

  unplaceDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.pinned === true) return s;
      if (die?.state !== "placed" || die.slot === undefined) return s;
      const slot = s.slots[die.slot];
      if (slot === undefined) return s;
      return {
        dice: patchDie(s.dice, uid, { state: "tray", slot: undefined }),
        slots: { ...s.slots, [die.slot]: { ...slot, dieUid: undefined } },
      };
    });
  },

  reserveDie: (uid) => {
    set((s) => {
      if (!canReserve(s, uid)) return s;
      return {
        dice: patchDie(s.dice, uid, { state: "reserved", slot: undefined }),
        selectedDieUid: null,
      };
    });
  },

  unreserveDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "reserved") return s;
      return {
        dice: patchDie(s.dice, uid, { state: "tray" }),
      };
    });
  },

  selectDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (uid === null) {
        return { selectedDieUid: null, swapSourceUid: null, fuseSourceUid: null };
      }
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined) return s;
      if (die.state !== "tray" && die.state !== "placed") return s;
      const fuseFrom =
        s.fuseSourceUid === null
          ? undefined
          : s.dice.find((d) => d.uid === s.fuseSourceUid);
      if (fuseFrom !== undefined && isFuseTarget(fuseFrom, die)) {
        get().fuseDice(uid);
        return {};
      }
      const source =
        s.swapSourceUid === null
          ? undefined
          : s.dice.find((d) => d.uid === s.swapSourceUid);
      if (source === undefined || !isSwapTarget(source, die)) {
        return { selectedDieUid: uid };
      }
      return {
        selectedDieUid: uid,
        swapSourceUid: null,
        dice: s.dice.map((d) =>
          d.uid === source.uid
            ? { ...d, value: die.value, activeUsed: true }
            : d.uid === die.uid
              ? { ...d, value: source.value }
              : d,
        ),
      };
    });
  },

  beginSwap: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canSwap(die)) return s;
      return { swapSourceUid: uid };
    });
  },

  cancelSwap: () => {
    set({ swapSourceUid: null });
  },

  bankDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canBank(die)) return s;
      return {
        dice: patchDie(s.dice, uid, {
          bankedValue: die.value,
          activeUsed: true,
        }),
      };
    });
  },

  splitDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (s.streams === null) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canSplit(die)) return s;
      const spawned: RolledDie[] = [];
      for (let i = 0; i < SPLIT_DIE_COUNT; i += 1) {
        const def = DIE_BY_ID.get(SPLIT_DIE_DEF);
        if (def === undefined) break;
        spawned.push({
          uid: `${uid}-split${String(i)}`,
          defId: SPLIT_DIE_DEF,
          tier: def.tier,
          school: def.school,
          value: rollBaseValue(SPLIT_DIE_DEF, def.tier, s.streams.dice),
          state: "tray",
          temp: true,
        });
      }
      if (spawned.length === 0) return s;
      return {
        rollSeq: s.rollSeq + 1,
        rolledUids: spawned.map((die) => die.uid),
        selectedDieUid: null,
        dice: [
          ...s.dice.map((d) =>
            d.uid === uid
              ? { ...d, state: "burned" as const, slot: undefined, activeUsed: true }
              : d,
          ),
          ...spawned,
        ],
      };
    });
  },

  beginFuse: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (passiveActionOf(s.shipId) !== "fuse" || s.passiveUsed) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canFuse(die)) return s;
      if (!s.dice.some((d) => isFuseTarget(die, d))) return s;
      return { fuseSourceUid: uid };
    });
  },

  cancelFuse: () => {
    set({ fuseSourceUid: null });
  },

  fuseDice: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (passiveActionOf(s.shipId) !== "fuse" || s.passiveUsed) return s;
      const source = s.dice.find((d) => d.uid === s.fuseSourceUid);
      const target = s.dice.find((d) => d.uid === uid);
      if (source === undefined || target === undefined) return s;
      if (!isFuseTarget(source, target)) return s;
      const spawned = fusedDie(
        source,
        target,
        shipProfile(s.shipId).fuseTierStep,
      );
      return {
        passiveUsed: true,
        fuseSourceUid: null,
        selectedDieUid: spawned.uid,
        dice: [
          ...s.dice.map((d) =>
            d.uid === source.uid || d.uid === target.uid
              ? { ...d, state: "burned" as const, slot: undefined }
              : d,
          ),
          { ...spawned, expiresTurn: s.turn },
        ],
      };
    });
  },

  reschoolDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (passiveActionOf(s.shipId) !== "reschool" || s.passiveUsed) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canReschool(die)) return s;
      return {
        passiveUsed: true,
        dice: patchDie(s.dice, uid, {
          school: "prismatic",
          reschooled: true,
        }),
      };
    });
  },

  setTarget: (targetId) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const alive =
        s.enemies.some((e) => e.id === targetId && e.hp > 0) ||
        s.enemies.some(
          (e) =>
            e.hp > 0 && e.subsystems.some((x) => x.id === targetId && x.hp > 0),
        );
      if (!alive) return s;
      return { targetId };
    });
  },

  spendNudge: (uid, dir) => {
    set((s) => {
      if (s.phase !== "placement") return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined) return s;
      if (die.state !== "tray" && die.state !== "placed") return s;
      const value = Math.min(dieValueCeiling(die), Math.max(1, die.value + dir));
      if (value === die.value) return s;
      const springFree = springFreeFor(s, die);
      const useFree = !springFree && s.freeNudges > 0;
      const cost = nudgeChargePrice(s);
      if (!springFree && !useFree && s.charge < cost) return s;
      return {
        charge: springFree || useFree ? s.charge : s.charge - cost,
        freeNudges: useFree ? s.freeNudges - 1 : s.freeNudges,
        spentGrants: springFree
          ? [...s.spentGrants, `nudge:${uid}`]
          : s.spentGrants,
        dice: patchDie(s.dice, uid, { value }),
      };
    });
  },

  spendBonusReroll: () => {
    set((s) => {
      if (
        s.phase !== "placement" ||
        s.rerollsLeft <= 0 ||
        s.charge < BONUS_REROLL_COST
      ) {
        return s;
      }
      return {
        charge: s.charge - BONUS_REROLL_COST,
        rerollSize: s.rerollSize + 1,
      };
    });
  },

  spendSurge: () => {
    set((s) => {
      if (s.phase !== "placement" || s.charge < SURGE_COST) return s;
      return { charge: s.charge - SURGE_COST, nextRollBonus: 1 };
    });
  },

  bloodReactor: () => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (!sourceTrait(s, "bloodReactor")) return s;
      if (s.bloodReactorUsed || s.hull <= BLOOD_REACTOR_HULL) return s;
      return {
        hull: s.hull - BLOOD_REACTOR_HULL,
        charge: Math.min(s.chargeCap, s.charge + BLOOD_REACTOR_CHARGE),
        bloodReactorUsed: true,
      };
    });
  },

  sacrificeDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      if (!sourceTrait(s, "sacrifice")) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "tray") return s;
      return {
        dice: patchDie(s.dice, uid, { state: "burned", slot: undefined }),
        sacrificePool: s.sacrificePool + SACRIFICE_DAMAGE,
        selectedDieUid: null,
      };
    });
  },

  flipDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die === undefined || !canFlip(die)) return s;
      if (die.state !== "tray" && die.state !== "placed") return s;
      const value = flippedValue(die);
      return {
        dice: patchDie(s.dice, uid, { value, activeUsed: true }),
      };
    });
  },

  copyDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "tray" || !canCopy(die, s.resonance)) return s;
      const value = adjacentCopyValue(s.dice, uid, tableSizeFor(s.ascension));
      if (value === undefined) return s;
      return {
        dice: patchDie(s.dice, uid, { value, activeUsed: true }),
      };
    });
  },

  rollFate: () => {
    const s = get();
    if (s.phase !== "placement" || s.rerollMode) return;
    if (s.streams === null) return;
    if (s.fateUses >= fateMaxUses(s)) return;
    if (!s.dice.some((d) => d.defId === FATE_DIE_ID)) return;
    const roll = s.streams.fate.int(1, 100);
    const outcome: FateOutcome = fateOutcomeFor(roll);
    const snapshot = battleSnapshot(s);
    snapshot.enemies = structuredClone(s.enemies);
    snapshot.blockedSlots = [...s.blockedSlots];
    const ctx = new BattleCtx(snapshot, snapshot.flags);
    applyActions(outcome.do, ctx);
    syncSnapshotFlags(snapshot, ctx);
    snapshot.charge = Math.max(0, Math.min(snapshot.chargeCap, snapshot.charge));
    snapshot.scrap = Math.max(0, snapshot.scrap);
    const veto = echoVetoHull(s.echo);
    if (
      veto > 0 &&
      s.hull > 0 &&
      snapshot.hull <= 0 &&
      useRunStore.getState().spendEcho()
    ) {
      snapshot.hull = veto;
    }
    set({
      ...fromSnapshot(snapshot),
      fateUses: s.fateUses + 1,
      fateRoll: roll,
      fateOutcomeId: outcome.id,
    });
    recordAction(`fate:${String(roll)}`);
  },

  useOfficerActive: (officerId) => {
    const s = get();
    if (s.phase !== "placement" || s.rerollMode) return;
    if (!s.officers.includes(officerId)) return;
    const def = officerDef(officerId);
    if (def === undefined) return;
    const token = officerToken(officerId);
    if (s.spentGrants.includes(token)) return;
    if (s.charge < officerChargeCost(def.active)) return;
    const aimed = aimedEnemy(s.enemies, s.targetId);
    if (officerActiveDead(def.active, aimed?.statuses.mark)) return;
    if (def.active.id === "restart") {
      set({
        rerollsLeft: s.rerollsLeft + def.active.rerolls,
        spentGrants: [...s.spentGrants, token],
      });
      recordAction(`officer:${officerId}`);
      return;
    }
    const snapshot = battleSnapshot(s);
    snapshot.enemies = structuredClone(s.enemies);
    snapshot.blockedSlots = [...s.blockedSlots];
    const ctx = new BattleCtx(snapshot, snapshot.flags);
    applyActions(officerActions(def.active), ctx);
    syncSnapshotFlags(snapshot, ctx);
    snapshot.charge = Math.max(0, Math.min(snapshot.chargeCap, snapshot.charge));
    snapshot.scrap = Math.max(0, snapshot.scrap);
    set({
      ...fromSnapshot(snapshot),
      spentGrants: [...s.spentGrants, token],
    });
    recordAction(`officer:${officerId}`);
  },

  useEchoActive: () => {
    const s = get();
    if (s.phase !== "placement" || s.rerollMode) return;
    const def = echoNodeDef(s.echo);
    if (def === undefined) return;
    const token = echoToken(def.id);
    if (s.spentGrants.includes(token)) return;
    if (def.id === "calculus") {
      set({
        nextTurnMods: {
          ...s.nextTurnMods,
          weapons: (s.nextTurnMods.weapons ?? 0) + def.weapons,
        },
        spentGrants: [...s.spentGrants, token],
      });
      recordAction(`echo:${def.id}`);
      return;
    }
    if (def.id !== "secondLook" || s.streams === null) return;
    const chosen = new Set(secondLookTargets(s.dice, def.dice));
    if (chosen.size === 0) return;
    const streams = s.streams;
    const blueFloor = resonanceAtLeast(s.resonance, "blue", 2);
    set({
      dice: s.dice.map((d) => {
        if (!chosen.has(d.uid)) return d;
        const rolled = rerollFace(d, streams.dice, blueFloor);
        return { ...d, value: Math.max(d.value, rolled) };
      }),
      rollSeq: s.rollSeq + 1,
      rolledUids: [...chosen],
      spentGrants: [...s.spentGrants, token],
    });
    recordAction(`echo:${def.id}`);
  },

  clearFateResult: () => {
    set({ fateRoll: null, fateOutcomeId: null });
  },

  toggleRerollMode: () => {
    set((s) => {
      if (s.phase !== "placement") return s;
      if (s.rerollMode) return { rerollMode: false, rerollSelection: [] };
      if (s.rerollsLeft <= 0) return s;
      return { rerollMode: true, rerollSelection: [], selectedDieUid: null };
    });
  },

  toggleRerollDie: (uid) => {
    set((s) => {
      if (s.phase !== "placement" || !s.rerollMode) return s;
      const die = s.dice.find((d) => d.uid === uid);
      if (die?.state !== "tray") return s;
      if (s.rerollSelection.includes(uid)) {
        return { rerollSelection: s.rerollSelection.filter((u) => u !== uid) };
      }
      if (s.rerollSelection.length >= s.rerollSize) return s;
      return { rerollSelection: [...s.rerollSelection, uid] };
    });
  },

  confirmReroll: () => {
    set((s) => {
      if (
        s.phase !== "placement" ||
        !s.rerollMode ||
        s.rerollsLeft <= 0 ||
        s.rerollSelection.length === 0 ||
        s.rerollSelection.length > s.rerollSize ||
        s.streams === null
      ) {
        return { rerollMode: false, rerollSelection: [] };
      }
      const streams = s.streams;
      const blueFloor = resonanceAtLeast(s.resonance, "blue", 2);
      const free = s.rerollSelection.every((uid) => {
        const die = s.dice.find((d) => d.uid === uid);
        return (
          die !== undefined && dieHasGrant(s.engravings, die.defId, "freeReroll")
        );
      });
      const taxed = s.enemies.some(
        (e) => e.hp > 0 && ENEMY_BY_ID.get(e.defId)?.feedsOnReroll === true,
      );
      const rerolled = s.dice
        .filter((d) => s.rerollSelection.includes(d.uid) && d.state === "tray")
        .map((d) => d.uid);
      return {
        rollSeq: s.rollSeq + 1,
        rolledUids: rerolled,
        dice: s.dice.map((d) => {
          if (!s.rerollSelection.includes(d.uid) || d.state !== "tray")
            return d;
          return { ...d, value: rerollFace(d, streams.dice, blueFloor) };
        }),
        enemies: taxed
          ? s.enemies.map((e) =>
              e.hp > 0 && ENEMY_BY_ID.get(e.defId)?.feedsOnReroll === true
                ? { ...e, statuses: { ...e.statuses, charge: 1 } }
                : e,
            )
          : s.enemies,
        rerollsLeft: free ? s.rerollsLeft : s.rerollsLeft - 1,
        rerollsUsed: s.rerollsUsed + 1,
        rerollMode: false,
        rerollSelection: [],
      };
    });
  },

  endTurn: () => {
    const s = get();
    if (s.phase !== "placement" || s.streams === null || s.enemyStream === null)
      return;
    if (checkEndTurnBlocked(s)) return;
    const scripted = checkMovesNow(s) !== null;
    const placed = s.dice.filter((d) => d.state === "placed");
    const blackUsed = scripted
      ? s.blackUsed
      : s.blackUsed + placed.filter((d) => d.school === "black").length;
    const blueUsed = scripted
      ? s.blueUsed
      : s.blueUsed + placed.filter((d) => d.school === "blue").length;
    const player = resolvePlayerPhase(battleSnapshot(s), s.streams.dice);
    let bundle: ResolutionBundle;
    if (player.next.outcome !== undefined) {
      bundle = {
        beats: player.beats,
        enemyBeats: [],
        final: player.next,
        finalPhase: "ended",
      };
    } else {
      const step = currentCheckStep(s);
      const defense =
        step?.defenseRolls === undefined
          ? s.streams.defense
          : scriptedDefense(step.defenseRolls, s.streams.defense);
      const enemy = resolveEnemyPhase(player.next, s.enemyStream, defense);
      if (enemy.next.outcome !== undefined) {
        bundle = {
          beats: player.beats,
          enemyBeats: enemy.beats,
          final: enemy.next,
          finalPhase: "ended",
        };
      } else {
        let final = advanceTurn(enemy.next, s.streams);
        if (s.debugNextRoll !== null) {
          const carried = new Set(
            enemy.next.dice
              .filter((d) => d.state === "reserved" || d.state === "locked")
              .map((d) => d.uid),
          );
          final = {
            ...final,
            dice: applyDebugRoll(final.dice, s.debugNextRoll, carried),
          };
        }
        const nextStep = s.checkSteps?.[s.checkIndex + 1];
        if (nextStep !== undefined) final = applyCheckStep(final, nextStep);
        bundle = {
          beats: player.beats,
          enemyBeats: enemy.beats,
          final,
          finalPhase: "placement",
        };
      }
    }
    const tally = tallyBundle(bundle);
    set({
      phase: "resolving",
      resolution: bundle,
      beats: bundle.beats,
      enemyBeats: bundle.enemyBeats,
      beatSeq: s.beatSeq + 1,
      log: appendLog(
        s.log,
        logEntriesFrom(bundle, {
          turn: s.turn,
          seq: s.beatSeq + 1,
          enemies: s.enemies,
        }),
      ),
      blackUsed,
      blueUsed,
      dicePlaced: s.dicePlaced + placed.length,
      maxResonance: Math.max(s.maxResonance, largestResonance(s.resonance)),
      shieldAbsorbed: s.shieldAbsorbed + tally.shieldAbsorbed,
      damageDealt: s.damageDealt + tally.damageDealt,
      damageTaken: s.damageTaken + tally.damageTaken,
      repairBayHealed: s.repairBayHealed + tally.repairBayHealed,
      spinalMaxHit: Math.max(s.spinalMaxHit, tally.spinalMaxHit),
      burnKilledElite: s.burnKilledElite || tally.burnKilledElite,
      rerollMode: false,
      rerollSelection: [],
      selectedDieUid: null,
      lastBlock: null,
      debugNextRoll: null,
    });
  },

  applyBeatSnapshot: (after) => {
    set((s) => {
      if (s.phase !== "resolving") return s;
      return fromSnapshot(after);
    });
  },

  finishResolution: () => {
    const s = get();
    if (s.phase !== "resolving" || s.resolution === null) return;
    const { final, finalPhase } = s.resolution;
    const run = useRunStore.getState();
    for (const key of final.flags ?? []) {
      if (run.flags[key] === undefined) run.setFlag(key);
    }
    for (const [key, value] of Object.entries(final.runCounters ?? {})) {
      const delta = value - (run.counters[key] ?? 0);
      if (delta !== 0) run.bumpCounter(key, delta);
    }
    const canReroll =
      finalPhase === "placement" &&
      !sourceTrait(s, "singleCast") &&
      !s.forcedTraits.includes("singleCast");
    const extra = Math.max(0, sourceMods(s).extraRerolls);
    const steps = s.checkSteps;
    const advanced =
      steps === null || finalPhase !== "placement"
        ? s.checkIndex
        : s.checkIndex + 1;
    const checkDone = steps !== null && advanced >= steps.length;
    set({
      ...fromSnapshot(final),
      phase: finalPhase,
      resolution: null,
      rerollsLeft: canReroll ? 1 + extra + (final.grants?.rerollUses ?? 0) : 0,
      rerollSize: s.rerollBase,
      checkSteps: checkDone ? null : steps,
      checkIndex: checkDone ? 0 : advanced,
      freeNudges:
        steps === null || checkDone
          ? s.freeNudges
          : (steps[advanced]?.grantFreeNudge ?? s.freeNudges),
      swapSourceUid: null,
      fuseSourceUid: null,
      lastBlock: null,
    });
    if (steps !== null && advanced !== s.checkIndex && !s.checkSandbox) {
      const done = steps[s.checkIndex];
      if (done !== undefined) noteCheckStep(s.checkIndex, done.id);
    }
    if (steps !== null && (checkDone || finalPhase === "ended")) {
      noteCheckFinished(s.checkSandbox, false);
    }
  },

  reset: () => {
    set(createInitialBattleValues());
  },
}));

export type BattleSaveValues = Omit<
  BattleValues,
  "streams" | "enemyStream" | "debugNextRoll" | "lastBlock"
>;

export interface BattleSaveState {
  values: BattleSaveValues;
  streamStates: StreamStates;
  enemyStreamState: number;
}

const BATTLE_SAVE_OMITTED: readonly (keyof BattleValues)[] = [
  "streams",
  "enemyStream",
  "debugNextRoll",
  "lastBlock",
];

const BATTLE_SAVE_KEYS = (
  Object.keys(createInitialBattleValues()) as (keyof BattleValues)[]
).filter(
  (key): key is keyof BattleSaveValues => !BATTLE_SAVE_OMITTED.includes(key),
);

const pickBattleValues = (s: BattleState): BattleSaveValues =>
  pickShape<BattleSaveValues>(BATTLE_SAVE_KEYS, s);

export const serializeBattle = (): BattleSaveState | null => {
  const s = useBattleStore.getState();
  if (s.phase === "idle" || s.streams === null || s.enemyStream === null) {
    return null;
  }
  return {
    values: pickBattleValues(s),
    streamStates: serializeStreams(s.streams),
    enemyStreamState: s.enemyStream.state(),
  };
};

export const hydrateBattle = (save: BattleSaveState): void => {
  useBattleStore.setState({
    ...createInitialBattleValues(),
    ...save.values,
    dice: assignSeats(save.values.dice, tableSizeFor(save.values.ascension)),
    streams: restoreStreams(save.streamStates),
    enemyStream: createStreamFromState(save.enemyStreamState),
    debugNextRoll: null,
  });
  if (save.values.phase === "resolving") {
    useBattleStore.getState().finishResolution();
  }
};
