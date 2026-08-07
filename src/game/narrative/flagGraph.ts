import { ALL_EVENTS } from "@/data/events";
import { BEACON_FLAGS } from "@/data/events/beacons";
import { COUNTER_FLAGS, RESERVED_FLAGS, RUNTIME_FLAGS } from "@/data/flags";
import { CHAINS } from "@/data/narrative/chains";
import { DEATH_LINES } from "@/data/narrative/deathLines";
import { GATED_FRAGMENTS } from "@/data/narrative/fragments";
import { ENDINGS } from "@/data/narrative/endings";
import { KEEPER_LINES } from "@/data/narrative/keeperLines";
import { EPILOGUE_ENTRIES } from "@/data/narrative/epilogue";
import { SHOP_FLAG_RULES } from "@/game/economy/shop";

export interface FlagUse {
  key: string;
  owners: string[];
}

const add = (map: Map<string, string[]>, key: string, owner: string): void => {
  const list = map.get(key);
  if (list === undefined) map.set(key, [owner]);
  else if (!list.includes(owner)) list.push(owner);
};

export const writtenFlags = (): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  for (const event of ALL_EVENTS) {
    for (const option of event.options) {
      const outcomes = [
        ...(option.outcomes ?? []),
        ...(option.onPass ?? []),
        ...(option.onFail ?? []),
      ];
      for (const outcome of outcomes) {
        for (const effect of outcome.effects) {
          if (effect.k === "flag") add(out, effect.key, `${event.id}.${option.id}`);
        }
        for (const [key] of outcome.follow?.setFlags ?? []) {
          add(out, key, `${event.id}.${option.id}`);
        }
      }
    }
  }
  for (const key of RUNTIME_FLAGS) add(out, key, "runtime");
  return out;
};

export const readFlags = (): Map<string, string[]> => {
  const out = new Map<string, string[]>();
  for (const event of ALL_EVENTS) {
    const query = event.requires?.flags;
    for (const key of [
      ...(query?.all ?? []),
      ...(query?.any ?? []),
      ...(query?.not ?? []),
    ]) {
      add(out, key, `event:${event.id}`);
    }
    for (const option of event.options) {
      if (option.requires?.req === "flag") {
        add(out, option.requires.key, `event:${event.id}.${option.id}`);
      }
    }
  }
  for (const entry of EPILOGUE_ENTRIES) {
    for (const key of entry.reads) add(out, key, `epilogue:${entry.id}`);
  }
  for (const line of DEATH_LINES) {
    for (const key of line.reads) add(out, key, `death:${line.id}`);
  }
  for (const ending of ENDINGS) {
    for (const key of ending.reads) add(out, key, `ending:${ending.id}`);
    for (const v of ending.variants ?? []) {
      for (const key of v.reads) add(out, key, `ending:${v.id}`);
    }
  }
  for (const chain of CHAINS) {
    for (const step of chain.steps) {
      for (const key of step.done) add(out, key, `chain:${chain.id}.${step.id}`);
      const q = step.requires;
      for (const key of [...(q?.all ?? []), ...(q?.any ?? []), ...(q?.not ?? [])]) {
        add(out, key, `chain:${chain.id}.${step.id}`);
      }
    }
    for (const key of chain.betrayal) add(out, key, `chain:${chain.id}`);
  }
  for (const frag of GATED_FRAGMENTS) {
    const q = frag.requires;
    for (const key of [...(q?.all ?? []), ...(q?.any ?? []), ...(q?.not ?? [])]) {
      add(out, key, `fragment:${frag.id}`);
    }
  }
  for (const keeper of KEEPER_LINES) {
    const q = keeper.requires;
    for (const key of [...(q?.all ?? []), ...(q?.any ?? []), ...(q?.not ?? [])]) {
      add(out, key, `keeper:${keeper.id}`);
    }
  }
  for (const rule of SHOP_FLAG_RULES) add(out, rule.key, "shop:price");
  for (const key of COUNTER_FLAGS) add(out, key, "shop:counter");
  for (const key of BEACON_FLAGS) add(out, key, "beacons:tally");
  return out;
};

export const deadFlags = (): FlagUse[] => {
  const written = writtenFlags();
  const read = readFlags();
  const reserved = new Set(RESERVED_FLAGS);
  const out: FlagUse[] = [];
  for (const [key, owners] of written) {
    if (read.has(key) || reserved.has(key)) continue;
    out.push({ key, owners });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
};

export const unwritableFlags = (): FlagUse[] => {
  const written = writtenFlags();
  const read = readFlags();
  const out: FlagUse[] = [];
  for (const [key, owners] of read) {
    if (written.has(key)) continue;
    out.push({ key, owners });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
};
