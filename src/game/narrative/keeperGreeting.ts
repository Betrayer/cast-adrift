import { keeperLinesFor, type KeeperLine, type KeeperVenue } from "@/data/narrative/keeperLines";
import { createStream, deriveSeed } from "@/services/rng";
import type { FlagValue } from "@/types/events";

export const keeperGreeting = (
  venue: KeeperVenue,
  seed: number,
  place: string,
  flags: Record<string, FlagValue>,
): KeeperLine => createStream(deriveSeed(seed, `keeper:${place}`)).pick(keeperLinesFor(venue, flags));
