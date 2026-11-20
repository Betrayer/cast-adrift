import { tableSeats } from "@/game/battle/table";
import type { RngStream } from "@/services/rng";
import type { BattleSnapshot, CheckStep, RolledDie } from "@/types/battle";

export const applyDebugRoll = (
  dice: RolledDie[],
  values: number[],
  skipUids: ReadonlySet<string>,
): RolledDie[] => {
  const seats = tableSeats(dice);
  return dice.map((die) => {
    const seat = seats.get(die.uid);
    const forced = seat === undefined ? undefined : values[seat];
    if (forced === undefined || die.state !== "tray" || skipUids.has(die.uid)) {
      return die;
    }
    return {
      ...die,
      value: Math.min(Math.max(1, Math.round(forced)), die.tier),
    };
  });
};

export const applyCheckStep = (
  snapshot: BattleSnapshot,
  step: CheckStep,
): BattleSnapshot => {
  const carried = new Set(
    snapshot.dice
      .filter((d) => d.state === "reserved" || d.state === "locked")
      .map((d) => d.uid),
  );
  const dice =
    step.fixedRoll === null
      ? snapshot.dice
      : applyDebugRoll(snapshot.dice, [...step.fixedRoll], carried);
  const intent = step.enemyIntent;
  const enemies =
    intent === undefined
      ? snapshot.enemies
      : snapshot.enemies.map((e, i) =>
          i === 0 ? { ...e, nextIntent: intent } : e,
        );
  const charge =
    step.setCharge === undefined
      ? snapshot.charge
      : Math.max(0, Math.min(snapshot.chargeCap, step.setCharge));
  return { ...snapshot, dice, enemies, charge };
};

export const scriptedDefense = (
  rolls: readonly number[],
  fallback: RngStream,
): RngStream => {
  let index = 0;
  return {
    next: fallback.next,
    int: (min, max) => {
      const pinned = rolls[index];
      index += 1;
      if (pinned === undefined) return fallback.int(min, max);
      return Math.min(max, Math.max(min, pinned));
    },
    pick: fallback.pick,
    weighted: fallback.weighted,
    shuffle: fallback.shuffle,
    state: fallback.state,
  };
};
