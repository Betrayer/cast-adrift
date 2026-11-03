import { DIE_BY_ID, rollBaseValue } from "@/data/dice";
import { reaimOffLockedCore } from "@/game/battle/damage";
import {
  curseOn,
  dieFitsSlot,
  isDieLocked,
  isSlotBlocked,
} from "@/game/battle/placement";
import { clone, syncCtxFlags } from "@/game/battle/resolveShared";
import {
  applyRollFloors,
  applySpareLowest,
  dieValueCeiling,
  rerollFace,
} from "@/game/battle/rollFloors";
import { applyObsidianPact } from "@/game/battle/setup";
import { clearMark } from "@/game/battle/statuses";
import {
  assignSeats,
  drawFromBag,
  drawStream,
  isOnTable,
  isTableExtra,
  keptSeats,
  tableSizeFor,
} from "@/game/battle/table";
import { BattleCtx, buildSources, emit } from "@/game/effects";
import { sourceTrait } from "@/game/run/runMods";
import type { RngStream, RngStreams } from "@/services/rng";
import type {
  BattleSnapshot,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";

const clampToTier = (die: RolledDie, value: number): number =>
  Math.min(dieValueCeiling(die), Math.max(1, value));

export const applyPendingTwists = (
  next: BattleSnapshot,
  dice: RolledDie[],
  rng: RngStream,
): void => {
  for (let i = 0; i < next.pendingTwist && dice.length > 0; i += 1) {
    const die = rng.pick(dice);
    const reroll = rerollFace(die, rng);
    die.value = clampToTier(die, Math.min(die.value, reroll));
  }
  for (let i = 0; i < next.pendingSwap && dice.length > 1; i += 1) {
    const sorted = [...dice].sort((a, b) => a.value - b.value);
    const low = sorted[0];
    const high = sorted[sorted.length - 1];
    if (low === undefined || high === undefined || low.uid === high.uid) break;
    const lowValue = low.value;
    low.value = clampToTier(low, high.value);
    high.value = clampToTier(high, lowValue);
  }
  for (let i = 0; i < next.pendingStorm; i += 1) {
    for (let k = 0; k < 2 && dice.length > 0; k += 1) {
      const die = rng.pick(dice);
      die.value = clampToTier(die, die.value + rng.pick([-1, 1]));
    }
  }
  next.pendingTwist = 0;
  next.pendingSwap = 0;
  next.pendingStorm = 0;
};

const applyHijack = (next: BattleSnapshot, rng: RngStream): void => {
  const pending = next.pendingHijack ?? 0;
  next.pendingHijack = 0;
  if (pending <= 0) return;
  for (let i = 0; i < pending; i += 1) {
    const tray = next.dice.filter((d) => d.state === "tray");
    if (tray.length === 0) return;
    const die = tray.reduce((best, d) => (d.value > best.value ? d : best));
    const open = (Object.entries(next.slots) as [SlotId, SlotState][]).filter(
      ([id, slot]) =>
        slot.dieUid === undefined &&
        !isSlotBlocked(next, id) &&
        dieFitsSlot(next, die, slot, id),
    );
    if (open.length === 0) return;
    const [chosen, slot] = rng.pick(open);
    die.state = "placed";
    die.slot = chosen;
    die.pinned = true;
    slot.dieUid = die.uid;
  }
};

export const advanceTurn = (
  snapshot: BattleSnapshot,
  streams: RngStreams,
): BattleSnapshot => {
  const next = clone(snapshot);
  next.turn += 1;
  next.foldedTurns = Math.max(0, (next.foldedTurns ?? 0) - 1);
  const ctx = new BattleCtx(next, next.flags);
  const sources = buildSources(next);
  emit(sources, "rollStart", ctx);
  next.blockedSlots = next.blockedSlots.filter((b) => b.untilTurn >= next.turn);
  next.shrunkSlots = next.shrunkSlots.filter((b) => b.untilTurn >= next.turn);
  next.lockedDice = next.lockedDice.filter((l) => l.untilTurn >= next.turn);
  next.cursedDice = (next.cursedDice ?? []).filter(
    (c) => c.untilTurn >= next.turn,
  );
  reaimOffLockedCore(next);
  next.dice = next.dice.filter(
    (die) => die.expiresTurn === undefined || die.expiresTurn >= next.turn,
  );
  const rolling = new Set<string>();
  const cleared = next.dice.map((die) => {
    if (isDieLocked(next, die.uid) && isOnTable(die)) {
      return {
        ...die,
        state: "locked" as const,
        slot: undefined,
        lastValue: undefined,
        pinned: undefined,
      };
    }
    if (die.state === "reserved") {
      return {
        ...die,
        state: "tray" as const,
        slot: undefined,
        lastValue: undefined,
        pinned: undefined,
      };
    }
    if (isTableExtra(die)) {
      rolling.add(die.uid);
      return die;
    }
    if (isOnTable(die) && die.bankedValue !== undefined) {
      rolling.add(die.uid);
      return die;
    }
    if (isOnTable(die)) {
      return {
        ...die,
        state: "discard" as const,
        slot: undefined,
        pinned: undefined,
        seat: undefined,
      };
    }
    return die;
  });
  const draw = drawFromBag(cleared, tableSizeFor(next.ascension) - keptSeats(cleared), () =>
    drawStream(streams.dice, next.turn),
  );
  for (const uid of draw.drawn) rolling.add(uid);
  next.dice = draw.dice.map((die) => {
    if (!rolling.has(die.uid)) return die;
    const base = rollBaseValue(die.defId, die.tier, streams.dice, die.faces);
    const rolled = Math.min(die.tier, Math.max(1, base + next.nextRollBonus));
    const banked = die.bankedValue;
    const shown = banked ?? rolled + (die.growth ?? 0);
    return {
      ...die,
      school:
        die.reschooled === true
          ? (DIE_BY_ID.get(die.defId)?.school ?? die.school)
          : die.school,
      reschooled: undefined,
      value: Math.max(1, shown - curseOn(next, die.uid)),
      lastValue: die.value > 0 ? die.value : undefined,
      state: "tray" as const,
      slot: undefined,
      pinned: undefined,
      bankedValue: undefined,
      activeUsed: banked === undefined ? die.activeUsed : false,
    };
  });
  next.dice = assignSeats(next.dice, tableSizeFor(next.ascension));
  for (const slot of Object.values(next.slots)) {
    slot.dieUid = undefined;
  }
  for (const enemy of next.enemies) clearMark(enemy.statuses);
  next.evasion = null;
  next.nextRollBonus = 0;
  next.sacrificePool = 0;
  next.bloodReactorUsed = false;

  const rolledDice = next.dice.filter((d) => rolling.has(d.uid));
  applyPendingTwists(next, rolledDice, streams.dice);
  applyRollFloors(rolledDice, next.resonance, sourceTrait(next, "stabilizer"));
  if (sourceTrait(next, "spareLowest")) applySpareLowest(rolledDice);
  applyObsidianPact(rolledDice, next.perks, next.chartPicks ?? [], next.modules ?? []);

  const rolledSources = buildSources(next);
  for (const die of rolledDice) {
    ctx.subjectDie = die;
    emit(rolledSources, "rolled", ctx);
  }
  ctx.subjectDie = null;
  applyHijack(next, streams.dice);
  syncCtxFlags(next, ctx);

  return next;
};
