import { schools } from "@/data/schools";
import type { SpeakerId } from "@/types/events";

// The cast reads by colour and mark before it reads by name: Mara trades in
// yellow, Yusuf keeps the fleet's blue, the Preacher speaks in black, the Keeper
// in the accent the beacons carry, the Huntress in red, the Warden in grey.
export const SPEAKER_TONE: Record<SpeakerId, string> = {
  mara: schools.yellow.text,
  yusuf: schools.blue.text,
  choirPreacher: schools.black.text,
  beaconKeeper: schools.green.text,
  bountyHuntress: schools.red.text,
  warden: schools.grey.text,
};

export const SPEAKER_GLYPH: Record<SpeakerId, string> = {
  mara: "⌘",
  yusuf: "⌁",
  choirPreacher: "☩",
  beaconKeeper: "✧",
  bountyHuntress: "⌖",
  warden: "⌸",
};

export const SPEAKER_IDS: readonly SpeakerId[] = [
  "mara",
  "yusuf",
  "choirPreacher",
  "beaconKeeper",
  "bountyHuntress",
  "warden",
];
