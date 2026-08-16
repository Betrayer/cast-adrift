import type { FlagQuery, FlagValue, SpeakerId } from "@/types/events";
import type { LocKey } from "@/types/content";

export type KeeperVenue = "shop" | "shipyard" | "beacon";

export interface KeeperLine {
  id: string;
  speaker: SpeakerId;
  venue: KeeperVenue;
  text: LocKey;
  requires?: FlagQuery;
}

const line = (
  id: string,
  speaker: SpeakerId,
  venue: KeeperVenue,
  requires?: FlagQuery,
): KeeperLine => ({
  id,
  speaker,
  venue,
  text: `content:keeper.${id}`,
  ...(requires === undefined ? {} : { requires }),
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

const MARA_REACTIVE: readonly KeeperLine[] = [
  line("mFriend1", "mara", "shop", { all: ["maraFriend"] }),
  line("mFriend2", "mara", "shop", { all: ["maraFriend"] }),
  line("mFriend3", "mara", "shop", { all: ["maraFriend"], not: ["maraDebt"] }),
  line("mGrudge1", "mara", "shop", { all: ["maraGrudge"] }),
  line("mGrudge2", "mara", "shop", { all: ["maraGrudge"] }),
  line("mGrudge3", "mara", "shop", { all: ["maraGrudge", "maraDebt"] }),
  line("mDebt1", "mara", "shop", { all: ["maraDebt"] }),
  line("mDebt2", "mara", "shop", { all: ["maraDebt"], not: ["maraGrudge"] }),
  line("mFavor1", "mara", "shop", { all: ["favorHeld"] }),
  line("mVault1", "mara", "shop", { all: ["maraVaultOpened"] }),
  line("mCourt1", "mara", "shop", { all: ["courtFair"] }),
  line("mCourier1", "mara", "shop", { all: ["courierFreed"] }),
];

const YUSUF_REACTIVE: readonly KeeperLine[] = [
  line("yFriend1", "yusuf", "shipyard", { all: ["yusufFriend"] }),
  line("yFriend2", "yusuf", "shipyard", {
    all: ["yusufFriend"],
    not: ["yusufGrudge"],
  }),
  line("yGrudge1", "yusuf", "shipyard", { all: ["yusufGrudge"] }),
  line("yGrudge2", "yusuf", "shipyard", { all: ["yusufGrudge"] }),
  line("yShared1", "yusuf", "shipyard", { all: ["fleetTruthShared"] }),
  line("yKept1", "yusuf", "shipyard", { all: ["fleetTruthKept"] }),
  line("yLost1", "yusuf", "shipyard", { all: ["fleetTruthLost"] }),
  line("yAnswered1", "yusuf", "shipyard", { all: ["fleetAnswered"] }),
  line("yLane1", "yusuf", "shipyard", { all: ["fleetLaneOpen"] }),
  line("yLaneShut1", "yusuf", "shipyard", { all: ["fleetLaneClosed"] }),
];

const KEEPER_REACTIVE: readonly KeeperLine[] = [
  line("kTrust1", "beaconKeeper", "beacon", { all: ["keeperTrust"] }),
  line("kRepaid1", "beaconKeeper", "beacon", { all: ["keeperRepaid"] }),
  line("kSlighted1", "beaconKeeper", "beacon", { all: ["keeperSlighted"] }),
  line("kSlighted2", "beaconKeeper", "beacon", {
    all: ["keeperSlighted"],
    not: ["keeperRepaid"],
  }),
  line("kBroken1", "beaconKeeper", "beacon", { all: ["beaconBroken"] }),
  line("kRebuilt1", "beaconKeeper", "beacon", { all: ["beaconRebuilt"] }),
  line("kLit1", "beaconKeeper", "beacon", { all: ["lighthouseLit"] }),
  line("kKey1", "beaconKeeper", "beacon", { all: ["beaconKey1"] }),
  line("kThree1", "beaconKeeper", "beacon", { all: ["beacon3"] }),
  line("kFive1", "beaconKeeper", "beacon", { all: ["beacon5"] }),
];

const BEYOND_REACTIVE: readonly KeeperLine[] = [
  line("bMara1", "mara", "shop", { all: ["crossedThreshold"] }),
  line("bMara2", "mara", "shop", { all: ["maraBeyond"] }),
  line("bMara3", "mara", "shop", { all: ["yardStripped"] }),
  line("bYusuf1", "yusuf", "shipyard", { all: ["crossedThreshold"] }),
  line("bYusuf2", "yusuf", "shipyard", { all: ["fleetRemembered"] }),
  line("bYusuf3", "yusuf", "shipyard", { all: ["fleetSilenced"] }),
  line("bKeeper1", "beaconKeeper", "beacon", { all: ["crossedThreshold"] }),
  line("bKeeper2", "beaconKeeper", "beacon", { all: ["hushHeard"] }),
  line("bKeeper3", "beaconKeeper", "beacon", { all: ["hushRefused"] }),
  line("bKeeper4", "beaconKeeper", "beacon", { all: ["thresholdHeard"] }),
  line("bKeeper5", "beaconKeeper", "beacon", { all: ["thresholdCommitted"] }),
  line("bKeeper6", "beaconKeeper", "beacon", { all: ["thresholdWalked"] }),
];

export const KEEPER_LINES: readonly KeeperLine[] = [
  ...series("mara", "mara", "shop", 18),
  ...MARA_REACTIVE,
  ...series("yusuf", "yusuf", "shipyard", 16),
  ...YUSUF_REACTIVE,
  ...series("keeper", "beaconKeeper", "beacon", 14),
  ...KEEPER_REACTIVE,
  ...BEYOND_REACTIVE,
];

export const REACTIVE_KEEPER_LINES: readonly KeeperLine[] = KEEPER_LINES.filter(
  (l) => l.requires !== undefined,
);

const matches = (
  flags: Record<string, FlagValue>,
  query: FlagQuery | undefined,
): boolean => {
  if (query === undefined) return true;
  const has = (key: string): boolean => flags[key] !== undefined;
  if (query.all !== undefined && !query.all.every(has)) return false;
  if (query.any !== undefined && !query.any.some(has)) return false;
  if (query.not !== undefined && query.not.some(has)) return false;
  return true;
};

export const keeperLinesFor = (
  venue: KeeperVenue,
  flags: Record<string, FlagValue> = {},
): KeeperLine[] => {
  const pool = KEEPER_LINES.filter(
    (l) => l.venue === venue && matches(flags, l.requires),
  );
  const reactive = pool.filter((l) => l.requires !== undefined);
  return reactive.length > 0 ? reactive : pool;
};
