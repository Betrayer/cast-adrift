import type { SpeakerId } from "@/types/events";
import type { LocKey } from "@/types/content";

export type KeeperVenue = "shop" | "shipyard" | "beacon";

export interface KeeperLine {
  id: string;
  speaker: SpeakerId;
  venue: KeeperVenue;
  text: LocKey;
}

// The recurring cast's counter talk (DESIGN §2.1: 40 keeper lines). Shops draw
// Mara, shipyards draw Yusuf, beacon scenes draw the Keeper — the seeded `shop`
// stream picks one per visit so a reloaded save hears the same greeting.
const line = (
  id: string,
  speaker: SpeakerId,
  venue: KeeperVenue,
): KeeperLine => ({
  id,
  speaker,
  venue,
  text: `content:keeper.${id}`,
});

const series = (
  prefix: string,
  speaker: SpeakerId,
  venue: KeeperVenue,
  n: number,
): KeeperLine[] =>
  Array.from({ length: n }, (_, i) =>
    line(`${prefix}${String(i + 1)}`, speaker, venue),
  );

export const KEEPER_LINES: readonly KeeperLine[] = [
  ...series("mara", "mara", "shop", 16),
  ...series("yusuf", "yusuf", "shipyard", 14),
  ...series("keeper", "beaconKeeper", "beacon", 10),
];

export const keeperLinesFor = (venue: KeeperVenue): KeeperLine[] =>
  KEEPER_LINES.filter((l) => l.venue === venue);
