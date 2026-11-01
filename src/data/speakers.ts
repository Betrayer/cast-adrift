import { schools, type SchoolColors } from "@/data/schools";
import type { School } from "@/types/content";
import type { SpeakerId } from "@/types/events";

const SPEAKER_INK: Record<SpeakerId, readonly [School, keyof SchoolColors]> = {
  mara: ["yellow", "text"],
  yusuf: ["blue", "text"],
  choirPreacher: ["black", "text"],
  beaconKeeper: ["green", "text"],
  bountyHuntress: ["red", "text"],
  warden: ["grey", "text"],
  coreCutter: ["prismatic", "text"],
  ines: ["black", "stroke"],
};

export const speakerTone = (who: SpeakerId): string => {
  const [school, ink] = SPEAKER_INK[who];
  return schools[school][ink];
};

export const SPEAKER_GLYPH: Record<SpeakerId, string> = {
  mara: "⌘",
  yusuf: "⌁",
  choirPreacher: "☩",
  beaconKeeper: "✧",
  bountyHuntress: "⌖",
  warden: "⌸",
  coreCutter: "⌬",
  ines: "⊚",
};
