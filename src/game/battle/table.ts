import { FATE_DIE_ID } from "@/data/fate";
import { TABLE_SIZE } from "@/game/economy/prices";
import { createStream, deriveSeed, type RngStream } from "@/services/rng";
import type { DieState, RolledDie } from "@/types/battle";

export const OFF_TABLE_STATES: ReadonlySet<DieState> = new Set<DieState>([
  "bag",
  "discard",
]);

export const isOnTable = (die: Pick<RolledDie, "state">): boolean =>
  !OFF_TABLE_STATES.has(die.state);

export const isTableExtra = (die: Pick<RolledDie, "temp" | "defId">): boolean =>
  die.temp === true || die.defId === FATE_DIE_ID;

export const tableDice = <T extends Pick<RolledDie, "state">>(
  dice: readonly T[],
): T[] => dice.filter(isOnTable);

export const tableSeats = (
  dice: readonly Pick<RolledDie, "uid" | "state" | "seat" | "temp" | "defId">[],
): Map<string, number> => {
  const seats = new Map<string, number>();
  const taken = new Set<number>();
  const pending: (typeof dice)[number][] = [];
  for (const die of dice) {
    if (!isOnTable(die)) continue;
    if (die.seat !== undefined && !taken.has(die.seat)) {
      seats.set(die.uid, die.seat);
      taken.add(die.seat);
    } else {
      pending.push(die);
    }
  }
  for (const die of pending) {
    let seat = isTableExtra(die) ? TABLE_SIZE : 0;
    while (taken.has(seat)) seat += 1;
    seats.set(die.uid, seat);
    taken.add(seat);
  }
  return seats;
};

export const seatCount = (
  dice: readonly Pick<RolledDie, "uid" | "state" | "seat" | "temp" | "defId">[],
): number => {
  let highest = TABLE_SIZE - 1;
  for (const seat of tableSeats(dice).values()) highest = Math.max(highest, seat);
  return highest + 1;
};

export const assignSeats = (dice: readonly RolledDie[]): RolledDie[] => {
  const seats = tableSeats(dice);
  return dice.map((die) => {
    const seat = seats.get(die.uid);
    if (seat === undefined) return die.seat === undefined ? die : { ...die, seat: undefined };
    return die.seat === seat ? die : { ...die, seat };
  });
};

export const bySeat = (dice: readonly RolledDie[]): RolledDie[] => {
  const seats = tableSeats(dice);
  return tableDice(dice).sort(
    (a, b) => (seats.get(a.uid) ?? 0) - (seats.get(b.uid) ?? 0),
  );
};

export const keptSeats = (dice: readonly RolledDie[]): number =>
  dice.filter((die) => isOnTable(die) && !isTableExtra(die)).length;

export const drawStream = (dice: RngStream, turn: number): RngStream =>
  createStream(deriveSeed(dice.state(), `draw:${String(turn)}`));

const sampleUids = (
  pool: readonly string[],
  count: number,
  stream: () => RngStream,
): string[] => {
  if (count <= 0) return [];
  if (count >= pool.length) return [...pool];
  const rng = stream();
  const order = [...pool];
  for (let i = 0; i < count; i += 1) {
    const j = rng.int(i, order.length - 1);
    const held = order[i] as string;
    order[i] = order[j] as string;
    order[j] = held;
  }
  const chosen = new Set(order.slice(0, count));
  return pool.filter((uid) => chosen.has(uid));
};

export interface DrawResult {
  dice: RolledDie[];
  drawn: ReadonlySet<string>;
  reshuffled: boolean;
}

export const drawFromBag = (
  dice: readonly RolledDie[],
  need: number,
  stream: () => RngStream,
): DrawResult => {
  let current = [...dice];
  let rng: RngStream | null = null;
  const shared = (): RngStream => {
    rng ??= stream();
    return rng;
  };
  const drawn = new Set<string>();
  let reshuffled = false;
  const pile = (state: DieState): string[] =>
    current
      .filter((die) => die.state === state && !isTableExtra(die))
      .map((die) => die.uid);
  const bag = pile("bag");
  let left = Math.max(0, need);
  for (const uid of sampleUids(bag, left, shared)) drawn.add(uid);
  left -= drawn.size;
  if (left > 0) {
    const discard = pile("discard");
    if (discard.length > 0) {
      reshuffled = true;
      const refill = new Set(discard);
      current = current.map((die) =>
        refill.has(die.uid) ? { ...die, state: "bag" as const } : die,
      );
      for (const uid of sampleUids(discard, left, shared)) drawn.add(uid);
    }
  }
  current = current.map((die) =>
    drawn.has(die.uid) ? { ...die, state: "tray" as const } : die,
  );
  return { dice: current, drawn, reshuffled };
};

export type HandGroupId = "table" | "reserve" | "bag" | "discard";

export const handGroups = (
  dice: readonly RolledDie[],
): Record<HandGroupId, RolledDie[]> => {
  const seated = bySeat(dice);
  return {
    table: seated.filter((die) => die.state !== "reserved"),
    reserve: seated.filter((die) => die.state === "reserved"),
    bag: dice.filter((die) => die.state === "bag"),
    discard: dice.filter((die) => die.state === "discard"),
  };
};
