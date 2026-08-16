import type { Rarity } from "@/types/content";
import type { EndingId } from "@/data/narrative/endings";

export const SFX_IDS = [
  "rollTumble",
  "place",
  "invalid",
  "reroll",
  "nudge",
  "surge",
  "charge",
  "weapons",
  "spinalFire",
  "spinalJam",
  "shields",
  "shieldHit",
  "shieldBreak",
  "engines",
  "sensors",
  "reactor",
  "repair",
  "hullHit",
  "dodge",
  "burnTick",
  "summon",
  "setComplete",
  "win",
  "lose",
  "lootCommon",
  "lootUncommon",
  "lootRare",
  "lootLegendary",
  "levelUp",
  "chartAllocate",
  "jump",
  "fogReveal",
  "bossIntro",
  "bossPhase",
  "endingSting",
  "buy",
  "eventOpen",
  "optionTick",
  "checkDrum",
  "checkPass",
  "checkFail",
  "consequenceChime",
  "puzzlePlace",
  "ruleTick",
  "solveT13",
  "solveT45",
  "puzzleFail",
  "attemptSpent",
  "navTick",
  "barkChime",
  "mkSweep",
  "tideUp",
  "cacheClaim",
  "detourEntry",
  "laneMotif",
  "bossDown",
  "eliteIntro",
  "journalStamp",
  "memoryReveal",
  "axisTick",
  "epilogueSting",
  "beaconEntry",
  "chainStep",
  "achievement",
  "unlockCard",
  "respecConfirm",
  "banish",
  "draftReroll",
  "thresholdHold",
  "inversionCue",
  "stormBeat",
  "foldBeat",
  "endingSeal",
  "endingMerge",
  "endingBargain",
  "endingSilent",
  "endingAnswer",
  "gateRaise",
  "gateBreak",
  "curseTick",
  "siphonPull",
  "bargainCoin",
  "enrageStep",
  "hijackDrag",
  "wardShift",
] as const;

export type SfxId = (typeof SFX_IDS)[number];

export const sfxSources = (id: string): readonly string[] => [
  `/audio/sfx/${id}.webm`,
  `/audio/sfx/${id}.wav`,
];

export const SFX_VARIANTS: Partial<Record<SfxId, number>> = {
  rollTumble: 3,
  place: 3,
  weapons: 3,
  hullHit: 3,
  shieldHit: 3,
  puzzlePlace: 3,
  navTick: 3,
  optionTick: 3,
};

export const variantId = (id: SfxId, index: number): string =>
  index <= 0 ? id : `${id}${String(index + 1)}`;

export const SFX_JITTER: Partial<Record<SfxId, number>> = {
  rollTumble: 0.04,
  place: 0.06,
  weapons: 0.05,
  hullHit: 0.05,
  shieldHit: 0.06,
  burnTick: 0.05,
  charge: 0.04,
  puzzlePlace: 0.06,
  ruleTick: 0.05,
  navTick: 0.05,
  optionTick: 0.06,
  chainStep: 0.03,
  axisTick: 0.04,
};

export const SFX_GAIN: Partial<Record<SfxId, number>> = {
  navTick: 0.12,
  optionTick: 0.2,
  ruleTick: 0.24,
  barkChime: 0.22,
  journalStamp: 0.24,
  axisTick: 0.3,
  laneMotif: 0.35,
  cacheClaim: 0.5,
  unlockCard: 0.55,
};

export const HOT_SFX: readonly SfxId[] = [
  "rollTumble",
  "place",
  "invalid",
  "weapons",
  "shields",
  "shieldHit",
  "hullHit",
  "engines",
  "sensors",
  "reactor",
  "dodge",
  "charge",
  "setComplete",
  "navTick",
];

export const MUSIC_IDS = ["menu", "map", "battle", "battleBoss"] as const;

export type MusicId = (typeof MUSIC_IDS)[number];

export const musicSources = (id: MusicId): readonly string[] => [
  `/audio/music/${id}.webm`,
  `/audio/music/${id}.wav`,
];

export const MUSIC_SECONDS = 20;

export const BOSS_LAYER_GAIN_BY_PHASE: readonly number[] = [
  0.4, 0.4, 0.62, 0.85, 1,
];

export const bossLayerGain = (phase: number): number => {
  const index = Math.max(0, Math.min(BOSS_LAYER_GAIN_BY_PHASE.length - 1, phase));
  return BOSS_LAYER_GAIN_BY_PHASE[index] ?? 0.55;
};

export const LOOT_SFX: Record<Rarity, SfxId> = {
  common: "lootCommon",
  uncommon: "lootUncommon",
  rare: "lootRare",
  legendary: "lootLegendary",
};

export const ENDING_SFX: Record<EndingId, SfxId> = {
  seal: "endingSeal",
  merge: "endingMerge",
  bargain: "endingBargain",
  silent: "endingSilent",
  answer: "endingAnswer",
};
