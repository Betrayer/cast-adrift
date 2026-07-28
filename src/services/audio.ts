import { Howl } from "howler";
import { MUSIC, SFX, type MusicId, type SfxId } from "@/data/audio";
import { useSettingsStore } from "@/stores/settingsStore";

const howls = new Map<SfxId, Howl>();
const beds = new Map<MusicId, Howl>();
let initialized = false;
let unsubscribe: (() => void) | null = null;
let visibilityBound = false;

const CROSSFADE_MS = 900;
const BOSS_LAYER_GAIN = 0.55;

const DUCK_GAIN = 0.35;

interface BedState {
  track: MusicId | null;
  layer: MusicId | null;
  suspended: boolean;
  ducked: boolean;
}

const bed: BedState = {
  track: null,
  layer: null,
  suspended: false,
  ducked: false,
};

let duckTimer = 0;

const sfxVolume = (): number => useSettingsStore.getState().sfxVol;
const musicVolume = (): number => useSettingsStore.getState().musicVol;

const bedHowl = (id: MusicId): Howl => {
  let howl = beds.get(id);
  if (howl === undefined) {
    howl = new Howl({ src: [MUSIC[id]], loop: true, volume: 0, html5: false });
    beds.set(id, howl);
  }
  return howl;
};

const targetGain = (id: MusicId): number => {
  if (bed.suspended) return 0;
  const base = musicVolume() * (bed.ducked ? DUCK_GAIN : 1);
  if (id === bed.layer) return base * BOSS_LAYER_GAIN;
  return id === bed.track ? base : 0;
};

const retune = (fadeMs: number): void => {
  for (const [id, howl] of beds) {
    const target = targetGain(id);
    const current = howl.volume();
    if (target <= 0.0001) {
      if (howl.playing()) {
        howl.fade(typeof current === "number" ? current : 0, 0, fadeMs);
        window.setTimeout(() => {
          if (targetGain(id) <= 0.0001) howl.stop();
        }, fadeMs + 40);
      }
      continue;
    }
    if (!howl.playing()) {
      howl.volume(0);
      howl.play();
    }
    howl.fade(typeof current === "number" ? current : 0, target, fadeMs);
  }
};

const onVisibility = (): void => {
  bed.suspended = document.hidden;
  retune(document.hidden ? 200 : CROSSFADE_MS);
};

export const initAudio = (): void => {
  if (initialized) return;
  initialized = true;
  const volume = sfxVolume();
  for (const id of Object.keys(SFX) as SfxId[]) {
    howls.set(id, new Howl({ src: [SFX[id]], volume, preload: true }));
  }
  unsubscribe = useSettingsStore.subscribe((state, prev) => {
    if (state.sfxVol !== prev.sfxVol) {
      for (const howl of howls.values()) howl.volume(state.sfxVol);
    }
    if (state.musicVol !== prev.musicVol) retune(180);
  });
  if (!visibilityBound && typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
    visibilityBound = true;
  }
};

export const playSfx = (id: SfxId): void => {
  if (typeof window === "undefined") return;
  if (!initialized) initAudio();
  const volume = sfxVolume();
  if (volume <= 0) return;
  const howl = howls.get(id);
  if (howl === undefined) return;
  howl.volume(volume);
  howl.play();
};

// One bed at a time plus an optional layer that rides on top of it: the boss
// intensity track is the same length, so it stays phase-locked to the battle bed.
export const playMusic = (
  track: MusicId | null,
  options?: { layer?: MusicId | null; fadeMs?: number },
): void => {
  if (typeof window === "undefined") return;
  if (!initialized) initAudio();
  const layer = options?.layer ?? null;
  if (bed.track === track && bed.layer === layer) return;
  bed.track = track;
  bed.layer = layer;
  if (track !== null) bedHowl(track);
  if (layer !== null) bedHowl(layer);
  retune(options?.fadeMs ?? CROSSFADE_MS);
};

// DESIGN §10: fanfares own the mix for their length — the bed steps back
// instead of fighting them.
export const duckMusic = (ms = 1600): void => {
  if (typeof window === "undefined") return;
  bed.ducked = true;
  retune(160);
  window.clearTimeout(duckTimer);
  duckTimer = window.setTimeout(() => {
    bed.ducked = false;
    retune(500);
  }, ms);
};

export const stopMusic = (fadeMs = CROSSFADE_MS): void => {
  bed.track = null;
  bed.layer = null;
  retune(fadeMs);
};

export const disposeAudio = (): void => {
  unsubscribe?.();
  unsubscribe = null;
  if (visibilityBound && typeof document !== "undefined") {
    document.removeEventListener("visibilitychange", onVisibility);
    visibilityBound = false;
  }
  for (const howl of howls.values()) howl.unload();
  howls.clear();
  for (const howl of beds.values()) howl.unload();
  beds.clear();
  bed.track = null;
  bed.layer = null;
  bed.suspended = false;
  initialized = false;
};
