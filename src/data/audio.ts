import type { Rarity } from "@/types/content";

export const SFX = {
  rollTumble: "/audio/sfx/rollTumble.wav",
  place: "/audio/sfx/place.wav",
  invalid: "/audio/sfx/invalid.wav",
  reroll: "/audio/sfx/reroll.wav",
  nudge: "/audio/sfx/nudge.wav",
  surge: "/audio/sfx/surge.wav",
  charge: "/audio/sfx/charge.wav",
  weapons: "/audio/sfx/weapons.wav",
  spinalFire: "/audio/sfx/spinalFire.wav",
  spinalJam: "/audio/sfx/spinalJam.wav",
  shields: "/audio/sfx/shields.wav",
  shieldHit: "/audio/sfx/shieldHit.wav",
  shieldBreak: "/audio/sfx/shieldBreak.wav",
  engines: "/audio/sfx/engines.wav",
  sensors: "/audio/sfx/sensors.wav",
  reactor: "/audio/sfx/reactor.wav",
  repair: "/audio/sfx/repair.wav",
  hullHit: "/audio/sfx/hullHit.wav",
  dodge: "/audio/sfx/dodge.wav",
  burnTick: "/audio/sfx/burnTick.wav",
  summon: "/audio/sfx/summon.wav",
  setComplete: "/audio/sfx/setComplete.wav",
  win: "/audio/sfx/win.wav",
  lose: "/audio/sfx/lose.wav",
  lootCommon: "/audio/sfx/lootCommon.wav",
  lootUncommon: "/audio/sfx/lootUncommon.wav",
  lootRare: "/audio/sfx/lootRare.wav",
  lootLegendary: "/audio/sfx/lootLegendary.wav",
  levelUp: "/audio/sfx/levelUp.wav",
  chartAllocate: "/audio/sfx/chartAllocate.wav",
  jump: "/audio/sfx/jump.wav",
  fogReveal: "/audio/sfx/fogReveal.wav",
  bossIntro: "/audio/sfx/bossIntro.wav",
  bossPhase: "/audio/sfx/bossPhase.wav",
  endingSting: "/audio/sfx/endingSting.wav",
  buy: "/audio/sfx/buy.wav",
} as const;

export type SfxId = keyof typeof SFX;

export const MUSIC = {
  menu: "/audio/music/menu.wav",
  battle: "/audio/music/battle.wav",
  battleBoss: "/audio/music/battleBoss.wav",
} as const;

export type MusicId = keyof typeof MUSIC;

export const LOOT_SFX: Record<Rarity, SfxId> = {
  common: "lootCommon",
  uncommon: "lootUncommon",
  rare: "lootRare",
  legendary: "lootLegendary",
};
