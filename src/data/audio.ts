export const SFX = {
  roll: "/audio/sfx/roll.wav",
  place: "/audio/sfx/place.wav",
  hit: "/audio/sfx/hit.wav",
  shield: "/audio/sfx/shield.wav",
  win: "/audio/sfx/win.wav",
  lose: "/audio/sfx/lose.wav",
} as const;

export type SfxId = keyof typeof SFX;
