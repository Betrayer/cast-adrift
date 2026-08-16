import { schools } from "@/data/schools";
import type { SpeakerId } from "@/types/events";

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
