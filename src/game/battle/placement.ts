import { dieHasGrant } from "@/data/engravings";
import { overCapAllowed } from "@/game/battle/passives";
import { stepTier, TIER_LADDER } from "@/game/dice/tier";
import { slotMatches } from "@/game/effects/evaluate";
import type { ExceedCapGrant } from "@/game/effects/types";
import type {
  BattleSnapshot,
  RolledDie,
  SlotId,
  SlotState,
} from "@/types/battle";
import type { DieTier } from "@/types/content";

export const growTier = (tier: DieTier): DieTier => stepTier(tier, 1);

export const shrinkTier = (tier: DieTier): DieTier => {
  const index = TIER_LADDER.indexOf(tier);
  return index <= 0 ? tier : (TIER_LADDER[index - 1] ?? tier);
};

export const isSlotBlocked = (
  snapshot: Pick<BattleSnapshot, "blockedSlots" | "turn">,
  slotId: SlotId,
): boolean =>
  snapshot.blockedSlots.some(
    (b) => b.slot === slotId && b.untilTurn >= snapshot.turn,
  );

export const isSlotShrunk = (
  snapshot: Pick<BattleSnapshot, "shrunkSlots" | "turn">,
  slotId: SlotId,
): boolean =>
  (snapshot.shrunkSlots ?? []).some(
    (b) => b.slot === slotId && b.untilTurn >= snapshot.turn,
  );

export const effectiveCap = (
  snapshot: Pick<BattleSnapshot, "shrunkSlots" | "turn">,
  slotId: SlotId,
  slot: Pick<SlotState, "cap">,
): DieTier => (isSlotShrunk(snapshot, slotId) ? shrinkTier(slot.cap) : slot.cap);

export const isDieLocked = (
  snapshot: Pick<BattleSnapshot, "lockedDice" | "turn">,
  uid: string,
): boolean =>
  snapshot.lockedDice.some(
    (l) => l.uid === uid && l.untilTurn >= snapshot.turn,
  );

export const curseOn = (
  snapshot: Pick<BattleSnapshot, "cursedDice" | "turn">,
  uid: string,
): number =>
  (snapshot.cursedDice ?? [])
    .filter((c) => c.uid === uid && c.untilTurn >= snapshot.turn)
    .reduce((sum, c) => sum + c.n, 0);

export const exceedCapGrantFor = (
  snapshot: Pick<BattleSnapshot, "exceedCap">,
  die: Pick<RolledDie, "school">,
  slotId: SlotId,
): ExceedCapGrant | undefined =>
  (snapshot.exceedCap ?? []).find(
    (grant) =>
      (grant.school === undefined ||
        die.school === grant.school ||
        die.school === "prismatic") &&
      (grant.slot === undefined || slotMatches(slotId, grant.slot)),
  );

export const dieFitsSlot = (
  snapshot: Pick<
    BattleSnapshot,
    "resonance" | "shipId" | "shrunkSlots" | "turn" | "exceedCap"
  >,
  die: Pick<RolledDie, "tier" | "school">,
  slot: Pick<SlotState, "cap">,
  slotId: SlotId,
): boolean => {
  if (die.tier <= effectiveCap(snapshot, slotId, slot)) return true;
  if (exceedCapGrantFor(snapshot, die, slotId) !== undefined) return true;
  return overCapAllowed(snapshot.shipId, slotId) !== null;
};

export const canPlaceDie = (
  snapshot: Pick<
    BattleSnapshot,
    | "dice"
    | "slots"
    | "blockedSlots"
    | "shrunkSlots"
    | "lockedDice"
    | "turn"
    | "resonance"
    | "shipId"
    | "engravings"
    | "exceedCap"
  >,
  uid: string,
  slotId: SlotId,
): boolean => {
  const die = snapshot.dice.find((d) => d.uid === uid);
  const slot = snapshot.slots[slotId];
  if (die === undefined || slot === undefined) return false;
  const blocked =
    isSlotBlocked(snapshot, slotId) &&
    !dieHasGrant(snapshot.engravings, die.defId, "blockImmune");
  return (
    die.state === "tray" &&
    slot.dieUid === undefined &&
    dieFitsSlot(snapshot, die, slot, slotId) &&
    !blocked &&
    !isDieLocked(snapshot, uid)
  );
};
